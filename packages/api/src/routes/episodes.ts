// packages/api/src/routes/episodes.ts
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

    // Don't parse video_path here - let frontend handle it
    return c.json(episode)
  } catch (error) {
    console.error('Get episode error:', error)
    return c.json({ error: 'Failed to fetch episode' }, 500)
  }
})

// Update episode - FIXED SQL
episodes.put('/:id', async (c) => {
  const episodeId = c.req.param('id')
  const orgId = c.req.header('X-Org-Id')
  
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  const body = await c.req.json()
  const { 
    title, 
    description, 
    episode_number, 
    status,
    is_premium,
    is_early_access,
    scheduled_at,
    available_until
  } = body

  try {
    // Verify ownership
    const studio = await c.env.DB.prepare(
      'SELECT id FROM studios WHERE clerk_org_id = ?'
    ).bind(orgId).first()

    if (!studio) {
      return c.json({ error: 'Studio not found' }, 404)
    }

    // Check if episode belongs to this studio
    const ownership = await c.env.DB.prepare(`
      SELECT e.id 
      FROM episodes e
      JOIN series s ON e.series_id = s.id
      WHERE e.id = ? AND s.studio_id = ?
    `).bind(episodeId, studio.id).first()

    if (!ownership) {
      return c.json({ error: 'Episode not found or unauthorized' }, 404)
    }

    // Update episode
    const result = await c.env.DB.prepare(`
      UPDATE episodes 
      SET 
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        episode_number = COALESCE(?, episode_number),
        status = COALESCE(?, status),
        is_premium = COALESCE(?, is_premium),
        is_early_access = COALESCE(?, is_early_access),
        scheduled_at = ?,
        available_until = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `).bind(
      title || null,
      description || null,
      episode_number || null,
      status || null,
      is_premium !== undefined ? (is_premium ? 1 : 0) : null,
      is_early_access !== undefined ? (is_early_access ? 1 : 0) : null,
      scheduled_at || null,
      available_until || null,
      episodeId
    ).first()

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
        if (videoPath.startsWith('{') || videoPath.startsWith('[')) {
          const data = JSON.parse(videoPath)
          const pages = data.pages || data // Handle both formats
          
          if (Array.isArray(pages)) {
            // Old format - array of paths
            for (const path of pages) {
              await c.env.CONTENT.delete(path).catch(() => {})
            }
          } else if (pages && typeof pages === 'object') {
            // New format - pages with versions
            for (const page of Object.values(pages)) {
              const p = page as any
              await Promise.all([
                c.env.CONTENT.delete(p.original).catch(() => {}),
                c.env.CONTENT.delete(p.mobile).catch(() => {}),
                c.env.CONTENT.delete(p.thumbnail).catch(() => {})
              ])
            }
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

  const { pageOrder } = await c.req.json()

  try {
    // Get current chapter data
    const chapter = await c.env.DB.prepare(
      'SELECT video_path FROM episodes WHERE id = ?'
    ).bind(episodeId).first()

    if (!chapter) {
      return c.json({ error: 'Chapter not found' }, 404)
    }

    const videoPath = chapter.video_path as string
    let pages = []
    
    // Parse existing pages
    if (videoPath.startsWith('{')) {
      const data = JSON.parse(videoPath)
      pages = data.pages || []
    } else if (videoPath.startsWith('[')) {
      pages = JSON.parse(videoPath)
    }
    
    // Reorder based on pageOrder array
    const reorderedPages = []
    for (let i = 0; i < pageOrder.length; i++) {
      const oldIndex = pageOrder[i]
      if (pages[oldIndex]) {
        reorderedPages.push({
          ...pages[oldIndex],
          number: i + 1
        })
      }
    }

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

    const videoPath = chapter.video_path as string
    let pages = []
    
    // Parse existing pages
    if (videoPath.startsWith('{')) {
      const data = JSON.parse(videoPath)
      pages = data.pages || []
    } else if (videoPath.startsWith('[')) {
      // Convert old format to new
      const paths = JSON.parse(videoPath)
      pages = paths.map((path: string, idx: number) => ({
        number: idx + 1,
        original: path
      }))
    }

    const pageIndex = pageNumber - 1
    if (pageIndex < 0 || pageIndex >= pages.length) {
      return c.json({ error: 'Invalid page number' }, 400)
    }

    // Delete old page from R2
    const oldPage = pages[pageIndex]
    if (oldPage.original) {
      await c.env.CONTENT.delete(oldPage.original).catch(() => {})
    }
    if (oldPage.mobile) {
      await c.env.CONTENT.delete(oldPage.mobile).catch(() => {})
    }
    if (oldPage.thumbnail) {
      await c.env.CONTENT.delete(oldPage.thumbnail).catch(() => {})
    }

    // Upload new page
    const timestamp = Date.now()
    const basePath = `studios/${orgId}/series/${chapter.series_id}/chapter-${chapter.episode_number}`
    const newPath = `${basePath}/page-${pageNumber}-${timestamp}.jpg`
    
    await c.env.CONTENT.put(
      newPath,
      await newPageFile.arrayBuffer(),
      {
        httpMetadata: {
          contentType: newPageFile.type
        }
      }
    )

    // Update page metadata
    pages[pageIndex] = {
      number: pageNumber,
      original: newPath,
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

// Delete specific page
episodes.delete('/:id/pages/:pageNumber', async (c) => {
  const episodeId = c.req.param('id')
  const pageNumber = parseInt(c.req.param('pageNumber'))
  const orgId = c.req.header('X-Org-Id')
  
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  try {
    // Get current chapter
    const chapter = await c.env.DB.prepare(
      'SELECT * FROM episodes WHERE id = ?'
    ).bind(episodeId).first()

    if (!chapter) {
      return c.json({ error: 'Chapter not found' }, 404)
    }

    const videoPath = chapter.video_path as string
    let pages = []
    
    // Parse existing pages
    if (videoPath.startsWith('{')) {
      const data = JSON.parse(videoPath)
      pages = data.pages || []
    } else if (videoPath.startsWith('[')) {
      const paths = JSON.parse(videoPath)
      pages = paths.map((path: string, idx: number) => ({
        number: idx + 1,
        original: path
      }))
    }

    const pageIndex = pageNumber - 1
    if (pageIndex < 0 || pageIndex >= pages.length) {
      return c.json({ error: 'Invalid page number' }, 400)
    }

    // Delete from R2
    const pageToDelete = pages[pageIndex]
    if (pageToDelete.original) {
      await c.env.CONTENT.delete(pageToDelete.original).catch(() => {})
    }
    if (pageToDelete.mobile) {
      await c.env.CONTENT.delete(pageToDelete.mobile).catch(() => {})
    }
    if (pageToDelete.thumbnail) {
      await c.env.CONTENT.delete(pageToDelete.thumbnail).catch(() => {})
    }

    // Remove page and renumber
    pages.splice(pageIndex, 1)
    const renumberedPages = pages.map((page: any, idx: number) => ({
      ...page,
      number: idx + 1
    }))

    // Save to database
    await c.env.DB.prepare(`
      UPDATE episodes 
      SET video_path = ?, 
          page_count = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      JSON.stringify({ pages: renumberedPages }),
      renumberedPages.length,
      episodeId
    ).run()

    return c.json({ 
      success: true, 
      message: `Page ${pageNumber} deleted successfully`,
      total_pages: renumberedPages.length
    })
  } catch (error) {
    console.error('Delete page error:', error)
    return c.json({ error: 'Failed to delete page' }, 500)
  }
})

export default episodes