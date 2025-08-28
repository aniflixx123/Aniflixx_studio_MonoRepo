// Reading progress and manga-specific endpoints
import { Hono } from 'hono'
import { Bindings } from '../types'

const reading = new Hono<{ Bindings: Bindings }>()

// Save reading progress
reading.post('/progress', async (c) => {
  const body = await c.req.json()
  const { 
    user_id, 
    episode_id, 
    current_page, 
    total_pages,
    scroll_position,
    is_completed 
  } = body
  
  try {
    // Calculate completion percentage
    const completion_percentage = total_pages ? (current_page / total_pages) * 100 : 0
    
    await c.env.DB.prepare(`
      INSERT INTO reading_progress (
        user_id, 
        episode_id, 
        current_page, 
        total_pages,
        scroll_position,
        is_completed,
        completion_percentage,
        last_read_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, episode_id) 
      DO UPDATE SET 
        current_page = excluded.current_page,
        scroll_position = excluded.scroll_position,
        is_completed = excluded.is_completed,
        completion_percentage = excluded.completion_percentage,
        reading_time_seconds = reading_time_seconds + 5,
        last_read_at = CURRENT_TIMESTAMP
    `).bind(
      user_id,
      episode_id,
      current_page,
      total_pages || null,
      scroll_position || null,
      is_completed ? 1 : 0,
      completion_percentage
    ).run()
    
    // Update view count
    await c.env.DB.prepare(`
      UPDATE episodes 
      SET view_count = view_count + 1
      WHERE id = ?
    `).bind(episode_id).run()
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Save reading progress error:', error)
    return c.json({ error: 'Failed to save progress' }, 500)
  }
})

// Get reading progress for a user
reading.get('/progress/:userId/:episodeId', async (c) => {
  const userId = c.req.param('userId')
  const episodeId = c.req.param('episodeId')
  
  try {
    const progress = await c.env.DB.prepare(`
      SELECT * FROM reading_progress
      WHERE user_id = ? AND episode_id = ?
    `).bind(userId, episodeId).first()
    
    if (!progress) {
      return c.json({ 
        current_page: 1,
        is_completed: false,
        completion_percentage: 0
      })
    }
    
    return c.json(progress)
  } catch (error) {
    console.error('Get reading progress error:', error)
    return c.json({ error: 'Failed to get progress' }, 500)
  }
})

// Get user's reading history
reading.get('/history/:userId', async (c) => {
  const userId = c.req.param('userId')
  const limit = parseInt(c.req.query('limit') || '50')
  
  try {
    const history = await c.env.DB.prepare(`
      SELECT 
        rp.*,
        e.title as episode_title,
        e.episode_number,
        e.thumbnail,
        e.page_count,
        s.id as series_id,
        s.title as series_title,
        s.type,
        s.cover_image
      FROM reading_progress rp
      JOIN episodes e ON rp.episode_id = e.id
      JOIN series s ON e.series_id = s.id
      WHERE rp.user_id = ?
      ORDER BY rp.last_read_at DESC
      LIMIT ?
    `).bind(userId, limit).all()
    
    return c.json({
      success: true,
      data: history.results || []
    })
  } catch (error) {
    console.error('Get reading history error:', error)
    return c.json({ error: 'Failed to fetch history' }, 500)
  }
})

// Get chapter pages with proper structure
reading.get('/chapters/:id/pages', async (c) => {
  const chapterId = c.req.param('id')
  const quality = c.req.query('quality') || 'mobile'
  
  try {
    // First check if we're using new chapter_pages table
    const pages = await c.env.DB.prepare(`
      SELECT * FROM chapter_pages
      WHERE episode_id = ?
      ORDER BY page_number ASC
    `).bind(chapterId).all()
    
    if (pages.results && pages.results.length > 0) {
      // Using new structure
      const pageUrls = pages.results.map((page: any) => ({
        number: page.page_number,
        url: page[`${quality}_url`] || page.original_url,
        width: page.width,
        height: page.height
      }))
      
      return c.json({
        success: true,
        pages: pageUrls,
        total: pages.results.length
      })
    }
    
    // Fallback to old structure (JSON in video_path)
    const chapter = await c.env.DB.prepare(`
      SELECT 
        e.*, 
        s.type as series_type,
        s.default_reading_mode
      FROM episodes e
      JOIN series s ON e.series_id = s.id
      WHERE e.id = ? AND e.status = 'published'
    `).bind(chapterId).first()
    
    if (!chapter) {
      return c.json({ error: 'Chapter not found' }, 404)
    }
    
    // Parse pages data
    const pagesData = JSON.parse(chapter.video_path as string)
    const pagesArray = pagesData.pages || []
    
    // Return URLs based on quality preference
    const pageUrls = pagesArray.map((page: any) => ({
      number: page.number,
      url: page[quality] || page.mobile || page.original,
      width: page.width,
      height: page.height
    }))
    
    return c.json({
      success: true,
      chapter: {
        id: chapter.id,
        title: chapter.title,
        episode_number: chapter.episode_number,
        page_count: chapter.page_count,
        reading_mode: chapter.default_reading_mode || 'paged'
      },
      pages: pageUrls
    })
  } catch (error) {
    console.error('Get chapter pages error:', error)
    return c.json({ error: 'Failed to fetch pages' }, 500)
  }
})

// Mark chapter as read
reading.post('/mark-read', async (c) => {
  const { user_id, episode_id } = await c.req.json()
  
  try {
    await c.env.DB.prepare(`
      INSERT INTO reading_progress (
        user_id, episode_id, is_completed, completion_percentage, last_read_at
      ) VALUES (?, ?, 1, 100, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, episode_id) 
      DO UPDATE SET 
        is_completed = 1,
        completion_percentage = 100,
        completed_at = CURRENT_TIMESTAMP,
        last_read_at = CURRENT_TIMESTAMP
    `).bind(user_id, episode_id).run()
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Mark as read error:', error)
    return c.json({ error: 'Failed to mark as read' }, 500)
  }
})

export default reading