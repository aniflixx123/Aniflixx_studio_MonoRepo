import { Hono } from 'hono'
import { Bindings } from '../types'

const episodes = new Hono<{ Bindings: Bindings }>()

// Get single episode/chapter
episodes.get('/:id', async (c) => {
  const episodeId = c.req.param('id')
  
  try {
    const episode = await c.env.DB.prepare(
      'SELECT * FROM episodes WHERE id = ?'
    ).bind(episodeId).first()

    if (!episode) {
      return c.json({ error: 'Episode not found' }, 404)
    }

    // Parse video_path if it's JSON (for manga pages)
    if (typeof episode.video_path === 'string' && episode.video_path.startsWith('{')) {
      episode.video_path = JSON.parse(episode.video_path)
    }

    return c.json(episode)
  } catch (error) {
    console.error('Get episode error:', error)
    return c.json({ error: 'Failed to fetch episode' }, 500)
  }
})

// Update episode
episodes.put('/:id', async (c) => {
  const episodeId = c.req.param('id')
  const orgId = c.req.header('X-Org-Id')
  
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  const body = await c.req.json()
  const { title, description, episode_number, status } = body

  try {
    // Verify ownership
    const studio = await c.env.DB.prepare(
      'SELECT id FROM studios WHERE clerk_org_id = ?'
    ).bind(orgId).first()

    if (!studio) {
      return c.json({ error: 'Studio not found' }, 404)
    }

    const result = await c.env.DB.prepare(`
      UPDATE episodes e
      SET title = ?, description = ?, episode_number = ?, status = ?,
          updated_at = CURRENT_TIMESTAMP
      FROM series s
      WHERE e.id = ? 
        AND e.series_id = s.id 
        AND s.studio_id = ?
      RETURNING e.*
    `).bind(
      title,
      description || null,
      episode_number,
      status || 'draft',
      episodeId,
      studio.id
    ).first()

    if (!result) {
      return c.json({ error: 'Episode not found or unauthorized' }, 404)
    }

    return c.json(result)
  } catch (error) {
    console.error('Update episode error:', error)
    return c.json({ error: 'Failed to update episode' }, 500)
  }
})

// Delete episode
episodes.delete('/:id', async (c) => {
  const episodeId = c.req.param('id')
  const orgId = c.req.header('X-Org-Id')
  
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  try {
    const studio = await c.env.DB.prepare(
      'SELECT id FROM studios WHERE clerk_org_id = ?'
    ).bind(orgId).first()

    if (!studio) {
      return c.json({ error: 'Studio not found' }, 404)
    }

    // Get episode info for R2 cleanup
    const episode = await c.env.DB.prepare(`
      SELECT e.video_path 
      FROM episodes e
      JOIN series s ON e.series_id = s.id
      WHERE e.id = ? AND s.studio_id = ?
    `).bind(episodeId, studio.id).first()

    if (!episode) {
      return c.json({ error: 'Episode not found or unauthorized' }, 404)
    }

    // Delete from R2
    if (episode.video_path) {
      try {
        const videoPath = episode.video_path as string
        // Check if it's JSON (manga pages)
        if (videoPath.startsWith('{')) {
          const data = JSON.parse(videoPath)
          const pages = data.pages || []
          
          // Delete all page versions
          for (const page of pages) {
            await Promise.all([
              c.env.CONTENT.delete(page.original).catch(() => {}),
              c.env.CONTENT.delete(page.mobile).catch(() => {}),
              c.env.CONTENT.delete(page.thumbnail).catch(() => {})
            ])
          }
        } else {
          // Delete video file
          await c.env.CONTENT.delete(videoPath)
        }
      } catch (err) {
        console.error('R2 deletion error:', err)
      }
    }

    // Soft delete from database
    await c.env.DB.prepare(`
      UPDATE episodes 
      SET deleted_at = CURRENT_TIMESTAMP, status = 'archived'
      WHERE id = ?
    `).bind(episodeId).run()

    return c.json({ success: true, message: 'Episode deleted successfully' })
  } catch (error) {
    console.error('Delete episode error:', error)
    return c.json({ error: 'Failed to delete episode' }, 500)
  }
})

// Reorder pages in chapter
episodes.put('/:id/reorder-pages', async (c) => {
  const episodeId = c.req.param('id')
  const orgId = c.req.header('X-Org-Id')
  
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  const { pageOrder } = await c.req.json() // Array of page numbers in new order

  try {
    // Get current chapter data
    const chapter = await c.env.DB.prepare(
      'SELECT video_path FROM episodes WHERE id = ?'
    ).bind(episodeId).first()

    if (!chapter) {
      return c.json({ error: 'Chapter not found' }, 404)
    }

    const chapterData = JSON.parse(chapter.video_path as string)
    const pages = chapterData.pages || []
    
    // Create new order
    const reorderedPages = pageOrder.map((oldIndex: number, newIndex: number) => {
      const page = pages[oldIndex]
      return {
        ...page,
        number: newIndex + 1
      }
    })

    // Update database
    await c.env.DB.prepare(`
      UPDATE episodes 
      SET video_path = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      JSON.stringify({ pages: reorderedPages }),
      episodeId
    ).run()

    return c.json({ success: true, message: 'Pages reordered successfully' })
  } catch (error) {
    console.error('Reorder pages error:', error)
    return c.json({ error: 'Failed to reorder pages' }, 500)
  }
})

// Replace specific page
episodes.put('/:id/pages/:pageNumber', async (c) => {
  const episodeId = c.req.param('id')
  const pageNumber = parseInt(c.req.param('pageNumber'))
  const orgId = c.req.header('X-Org-Id')
  
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  try {
    const formData = await c.req.formData()
    const newPageFile = formData.get('page') as File
    
    if (!newPageFile) {
      return c.json({ error: 'No page file provided' }, 400)
    }

    // Get current chapter
    const chapter = await c.env.DB.prepare(
      'SELECT * FROM episodes WHERE id = ?'
    ).bind(episodeId).first()

    if (!chapter) {
      return c.json({ error: 'Chapter not found' }, 404)
    }

    const chapterData = JSON.parse(chapter.video_path as string)
    const pages = chapterData.pages || []
    const pageIndex = pageNumber - 1

    if (pageIndex < 0 || pageIndex >= pages.length) {
      return c.json({ error: 'Invalid page number' }, 400)
    }

    // Delete old versions from R2
    const oldPage = pages[pageIndex]
    await Promise.all([
      c.env.CONTENT.delete(oldPage.original).catch(() => {}),
      c.env.CONTENT.delete(oldPage.mobile).catch(() => {}),
      c.env.CONTENT.delete(oldPage.thumbnail).catch(() => {})
    ])

    // Upload new versions
    const { generateImageVersions } = await import('../utils/image')
    const versions = await generateImageVersions(newPageFile)
    const basePath = `studios/${orgId}/series/${chapter.series_id}/chapter-${chapter.episode_number}`
    
    await Promise.all([
      c.env.CONTENT.put(
        `${basePath}/original/page-${pageNumber}.jpg`,
        await newPageFile.arrayBuffer()
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

    // Update page metadata
    pages[pageIndex] = {
      number: pageNumber,
      original: `${basePath}/original/page-${pageNumber}.jpg`,
      mobile: `${basePath}/mobile/page-${pageNumber}.webp`,
      thumbnail: `${basePath}/thumb/page-${pageNumber}.webp`,
      size: newPageFile.size
    }

    // Save to database
    await c.env.DB.prepare(`
      UPDATE episodes 
      SET video_path = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      JSON.stringify({ pages }),
      episodeId
    ).run()

    return c.json({ success: true, message: `Page ${pageNumber} replaced successfully` })
  } catch (error) {
    console.error('Replace page error:', error)
    return c.json({ error: 'Failed to replace page' }, 500)
  }
})

export default episodes