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
// Upload series images (cover, banner, thumbnail)
upload.post('/series/:seriesId/images', async (c) => {
  const orgId = c.req.header('X-Org-Id')
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  const seriesId = c.req.param('seriesId')

  try {
    // Verify series ownership
    const series:any = await c.env.DB.prepare(`
      SELECT s.* FROM series s
      JOIN studios st ON s.studio_id = st.id
      WHERE s.id = ? AND st.clerk_org_id = ?
    `).bind(seriesId, orgId).first()

    if (!series) {
      return c.json({ error: 'Series not found or unauthorized' }, 404)
    }

    const formData = await c.req.formData()
    const updates: any = {}

    // Handle cover image
    const coverImage = formData.get('cover_image') as File
    if (coverImage) {
      // Delete old image if exists
      if (series.cover_image) {
        await c.env.CONTENT.delete(series.cover_image).catch(() => {})
      }

      const timestamp = Date.now()
      const coverPath = `studios/${orgId}/series/${seriesId}/cover-${timestamp}.jpg`
      
      await c.env.CONTENT.put(
        coverPath,
        await coverImage.arrayBuffer(),
        {
          httpMetadata: {
            contentType: coverImage.type,
          }
        }
      )
      updates.cover_image = coverPath
    }

    // Handle banner image
    const bannerImage = formData.get('banner_image') as File
    if (bannerImage) {
      if (series.banner_image) {
        await c.env.CONTENT.delete(series.banner_image).catch(() => {})
      }

      const timestamp = Date.now()
      const bannerPath = `studios/${orgId}/series/${seriesId}/banner-${timestamp}.jpg`
      
      await c.env.CONTENT.put(
        bannerPath,
        await bannerImage.arrayBuffer(),
        {
          httpMetadata: {
            contentType: bannerImage.type,
          }
        }
      )
      updates.banner_image = bannerPath
    }

    // Handle thumbnail
    const thumbnail = formData.get('thumbnail') as File
    if (thumbnail) {
      if (series.thumbnail_image) {
        await c.env.CONTENT.delete(series.thumbnail_image).catch(() => {})
      }

      const timestamp = Date.now()
      const thumbPath = `studios/${orgId}/series/${seriesId}/thumb-${timestamp}.jpg`
      
      await c.env.CONTENT.put(
        thumbPath,
        await thumbnail.arrayBuffer(),
        {
          httpMetadata: {
            contentType: thumbnail.type,
          }
        }
      )
      updates.thumbnail_image = thumbPath
    }

    // Update database with new image paths
    if (Object.keys(updates).length > 0) {
      const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ')
      await c.env.DB.prepare(`
        UPDATE series 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(...Object.values(updates), seriesId).run()
    }

    return c.json({ 
      success: true,
      message: 'Images uploaded successfully',
      ...updates 
    })

  } catch (error) {
    console.error('Series image upload error:', error)
    return c.json({ 
      error: 'Upload failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, 500)
  }
})

// Update specific series image
upload.put('/series/:seriesId/image/:imageType', async (c) => {
  const orgId = c.req.header('X-Org-Id')
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  const seriesId = c.req.param('seriesId')
  const imageType = c.req.param('imageType') // 'cover', 'banner', 'thumbnail', 'logo'

  // Validate image type
  const validTypes = ['cover', 'banner', 'thumbnail', 'logo']
  if (!validTypes.includes(imageType)) {
    return c.json({ error: 'Invalid image type' }, 400)
  }

  try {
    // Verify ownership
    const series = await c.env.DB.prepare(`
      SELECT s.* FROM series s
      JOIN studios st ON s.studio_id = st.id
      WHERE s.id = ? AND st.clerk_org_id = ?
    `).bind(seriesId, orgId).first()

    if (!series) {
      return c.json({ error: 'Series not found or unauthorized' }, 404)
    }

    const formData = await c.req.formData()
    const imageFile = formData.get('image') as File

    if (!imageFile) {
      return c.json({ error: 'No image file provided' }, 400)
    }

    // Map image type to database column
    const columnMap: any = {
      'cover': 'cover_image',
      'banner': 'banner_image',
      'thumbnail': 'thumbnail_image',
      'logo': 'logo_image'
    }
    const column = columnMap[imageType]

    // Delete old image if exists
    const oldImagePath:any = series[column]
    if (oldImagePath) {
      await c.env.CONTENT.delete(oldImagePath).catch(() => {})
    }

    // Upload new image
    const timestamp = Date.now()
    const newPath = `studios/${orgId}/series/${seriesId}/${imageType}-${timestamp}.jpg`
    
    await c.env.CONTENT.put(
      newPath,
      await imageFile.arrayBuffer(),
      {
        httpMetadata: {
          contentType: imageFile.type,
        }
      }
    )

    // Update database
    await c.env.DB.prepare(`
      UPDATE series 
      SET ${column} = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(newPath, seriesId).run()

    return c.json({ 
      success: true,
      message: `${imageType} image updated successfully`,
      path: newPath
    })

  } catch (error) {
    console.error('Update image error:', error)
    return c.json({ error: 'Failed to update image' }, 500)
  }
})
// Delete specific series image
upload.delete('/series/:seriesId/image/:imageType', async (c) => {
  const orgId = c.req.header('X-Org-Id')
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  const seriesId = c.req.param('seriesId')
  const imageType = c.req.param('imageType')

  // Validate image type
  const validTypes = ['cover', 'banner', 'thumbnail', 'logo']
  if (!validTypes.includes(imageType)) {
    return c.json({ error: 'Invalid image type' }, 400)
  }

  try {
    // Verify ownership and get current image path
    const series = await c.env.DB.prepare(`
      SELECT s.* FROM series s
      JOIN studios st ON s.studio_id = st.id
      WHERE s.id = ? AND st.clerk_org_id = ?
    `).bind(seriesId, orgId).first()

    if (!series) {
      return c.json({ error: 'Series not found or unauthorized' }, 404)
    }

    // Map image type to database column
    const columnMap: any = {
      'cover': 'cover_image',
      'banner': 'banner_image',
      'thumbnail': 'thumbnail_image',
      'logo': 'logo_image'
    }
    const column = columnMap[imageType]
    const imagePath:any = series[column]

    if (!imagePath) {
      return c.json({ error: `No ${imageType} image to delete` }, 404)
    }

    // Delete from R2
    await c.env.CONTENT.delete(imagePath)

    // Update database - set to null
    await c.env.DB.prepare(`
      UPDATE series 
      SET ${column} = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(seriesId).run()

    return c.json({ 
      success: true,
      message: `${imageType} image deleted successfully`
    })

  } catch (error) {
    console.error('Delete image error:', error)
    return c.json({ error: 'Failed to delete image' }, 500)
  }
})

export default upload