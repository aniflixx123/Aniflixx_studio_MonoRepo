import { Hono } from 'hono'
import { Bindings, PageMetadata } from '../types'
import { processImageForManga, generateImageVersions } from '../utils/image'
import { validateImageFile, validateChapterUpload } from '../utils/validation'

const upload = new Hono<{ Bindings: Bindings }>()

// Upload anime episode
upload.post('/episode', async (c) => {
  const orgId = c.req.header('X-Org-Id')
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  try {
    const formData = await c.req.formData()
    const seriesId = formData.get('seriesId') as string
    const episodeNumber = formData.get('episodeNumber') as string
    const episodeTitle = formData.get('episodeTitle') as string
    const description = formData.get('description') as string
    const videoFile = formData.get('video') as File

    if (!seriesId || !episodeNumber || !episodeTitle || !videoFile) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    // Upload video to R2
    const timestamp = Date.now()
    const videoKey = `studios/${orgId}/series/${seriesId}/episodes/ep${episodeNumber}-${timestamp}.mp4`
    
    const arrayBuffer = await videoFile.arrayBuffer()
    await c.env.CONTENT.put(videoKey, arrayBuffer, {
      httpMetadata: {
        contentType: videoFile.type,
      }
    })

    // Save to database
    const episodeResult = await c.env.DB.prepare(`
      INSERT INTO episodes (
        series_id,
        episode_number, 
        title, 
        description, 
        video_path,
        status
      ) VALUES (?, ?, ?, ?, ?, 'processing')
      RETURNING id
    `).bind(
      seriesId,
      parseInt(episodeNumber),
      episodeTitle,
      description || null,
      videoKey
    ).first()

    return c.json({ 
      success: true,
      episodeId: episodeResult?.id,
      message: 'Episode uploaded successfully'
    })
  } catch (error) {
    console.error('Episode upload error:', error)
    return c.json({ 
      error: 'Upload failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, 500)
  }
})

// Upload manga/webtoon chapter with multiple images
upload.post('/chapter', async (c) => {
  const orgId = c.req.header('X-Org-Id')
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  try {
    const formData = await c.req.formData()
    const seriesId = formData.get('seriesId') as string
    const chapterNumber = formData.get('chapterNumber') as string
    const chapterTitle = formData.get('chapterTitle') as string
    const description = formData.get('description') as string
    const totalPages = parseInt(formData.get('totalPages') as string)

    // Validate input
    const validation = validateChapterUpload(seriesId, chapterNumber, chapterTitle, totalPages)
    if (!validation.valid) {
      return c.json({ error: 'Validation failed', errors: validation.errors }, 400)
    }

    const pageMetadata: PageMetadata[] = []
    const basePath = `studios/${orgId}/series/${seriesId}/chapter-${chapterNumber}`

    // Process each page
    for (let i = 0; i < totalPages; i++) {
      const pageFile = formData.get(`page_${i}`) as File
      
      if (!pageFile) {
        return c.json({ error: `Missing page ${i + 1}` }, 400)
      }

      // Validate image
      const fileValidation = validateImageFile(pageFile)
      if (!fileValidation.valid) {
        return c.json({ 
          error: `Page ${i + 1} validation failed`, 
          details: fileValidation.error 
        }, 400)
      }

      // For now, upload original only and use CDN resizing
      // Later you can add actual image processing
      const originalPath = `${basePath}/page-${i + 1}.jpg`
      
      await c.env.CONTENT.put(
        originalPath,
        await pageFile.arrayBuffer(),
        { httpMetadata: { contentType: pageFile.type } }
      )
      
      // Generate CDN URLs with resize parameters
      const { generateResponsiveUrls } = await import('../utils/image')
      const cdnBaseUrl = `https://cdn.aniflixx.com/${originalPath}`
      const urls = generateResponsiveUrls(cdnBaseUrl)

      pageMetadata.push({
        number: i + 1,
        original: originalPath,
        mobile: urls.mobile,
        thumbnail: urls.thumbnail,
        size: pageFile.size
      })
    }

    // Save to database
    const episodeResult = await c.env.DB.prepare(`
      INSERT INTO episodes (
        series_id,
        episode_number, 
        title, 
        description, 
        video_path,
        page_count,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, 'draft')
      RETURNING id
    `).bind(
      seriesId,
      parseInt(chapterNumber),
      chapterTitle,
      description || null,
      JSON.stringify({ pages: pageMetadata }),
      totalPages
    ).first()

    return c.json({ 
      success: true,
      chapterId: episodeResult?.id,
      totalPages: pageMetadata.length,
      message: `Chapter ${chapterNumber} uploaded successfully`
    })

  } catch (error) {
    console.error('Chapter upload error:', error)
    return c.json({ 
      error: 'Upload failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, 500)
  }
})

// Add pages to existing chapter
upload.post('/chapter/:chapterId/pages', async (c) => {
  const orgId = c.req.header('X-Org-Id')
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  const chapterId = c.req.param('chapterId')

  try {
    // Get existing chapter
    const chapter = await c.env.DB.prepare(
      'SELECT * FROM episodes WHERE id = ?'
    ).bind(chapterId).first()

    if (!chapter) {
      return c.json({ error: 'Chapter not found' }, 404)
    }

    const existingData = JSON.parse(chapter.video_path as string)
    const existingPages = existingData.pages || []
    
    const formData = await c.req.formData()
    const newPagesCount = parseInt(formData.get('totalPages') as string)
    
    const newPageMetadata: PageMetadata[] = []
    const basePath = `studios/${orgId}/series/${chapter.series_id}/chapter-${chapter.episode_number}`
    const startIndex = existingPages.length

    // Process new pages
    for (let i = 0; i < newPagesCount; i++) {
      const pageFile = formData.get(`page_${i}`) as File
      
      if (!pageFile) continue

      const pageNumber = startIndex + i + 1
      const versions = await generateImageVersions(pageFile)
      
      // Upload versions
      await Promise.all([
        c.env.CONTENT.put(
          `${basePath}/original/page-${pageNumber}.jpg`,
          await pageFile.arrayBuffer()
        ),
        c.env.CONTENT.put(
          `${basePath}/mobile/page-${pageNumber}.webp`,
          await versions.mobile.arrayBuffer()
        ),
        c.env.CONTENT.put(
          `${basePath}/thumb/page-${pageNumber}.webp`,
          await versions.thumbnail.arrayBuffer()
        )
      ])

      newPageMetadata.push({
        number: pageNumber,
        original: `${basePath}/original/page-${pageNumber}.jpg`,
        mobile: `${basePath}/mobile/page-${pageNumber}.webp`,
        thumbnail: `${basePath}/thumb/page-${pageNumber}.webp`,
        size: pageFile.size
      })
    }

    // Update database
    const updatedPages = [...existingPages, ...newPageMetadata]
    await c.env.DB.prepare(`
      UPDATE episodes 
      SET video_path = ?, page_count = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      JSON.stringify({ pages: updatedPages }),
      updatedPages.length,
      chapterId
    ).run()

    return c.json({
      success: true,
      addedPages: newPageMetadata.length,
      totalPages: updatedPages.length
    })

  } catch (error) {
    console.error('Add pages error:', error)
    return c.json({ error: 'Failed to add pages' }, 500)
  }
})

export default upload