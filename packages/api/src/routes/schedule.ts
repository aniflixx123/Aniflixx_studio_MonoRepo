import { Hono } from 'hono'
import { Bindings } from '../types'

const schedule = new Hono<{ Bindings: Bindings }>()

// Schedule episode publishing
schedule.post('/publish', async (c) => {
  const orgId = c.req.header('X-Org-Id')
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  const { episode_id, scheduled_at } = await c.req.json()

  try {
    // Add to publish queue
    await c.env.DB.prepare(`
      INSERT INTO publish_queue (
        episode_id, action, scheduled_at, status
      ) VALUES (?, 'publish', ?, 'pending')
    `).bind(episode_id, scheduled_at).run()

    // Update episode status
    await c.env.DB.prepare(`
      UPDATE episodes 
      SET status = 'scheduled', scheduled_at = ?
      WHERE id = ?
    `).bind(scheduled_at, episode_id).run()

    return c.json({ success: true, message: 'Episode scheduled for publishing' })
  } catch (error) {
    console.error('Schedule publish error:', error)
    return c.json({ error: 'Failed to schedule publishing' }, 500)
  }
})

// Process scheduled publications (should be called by cron)
schedule.post('/process-queue', async (c) => {
  try {
    // Get pending items that should be published
    const pending = await c.env.DB.prepare(`
      SELECT * FROM publish_queue 
      WHERE status = 'pending' 
        AND scheduled_at <= datetime('now')
      ORDER BY scheduled_at 
      LIMIT 10
    `).all()

    let processed = 0
    
    for (const item of pending.results || []) {
      try {
        // Update episode status to published
        await c.env.DB.prepare(`
          UPDATE episodes 
          SET status = 'published', 
              published_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(item.episode_id).run()
        
        // Mark queue item as completed
        await c.env.DB.prepare(`
          UPDATE publish_queue 
          SET status = 'completed', 
              completed_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(item.id).run()
        
        processed++
      } catch (err) {
        // Mark as failed
        await c.env.DB.prepare(`
          UPDATE publish_queue 
          SET status = 'failed',
              retry_count = retry_count + 1,
              error_message = ?
          WHERE id = ?
        `).bind(
          err instanceof Error ? err.message : 'Unknown error',
          item.id
        ).run()
      }
    }

    return c.json({ 
      success: true,
      processed,
      total: pending.results?.length || 0
    })
  } catch (error) {
    console.error('Queue processing error:', error)
    return c.json({ error: 'Failed to process queue' }, 500)
  }
})

// Get scheduled items
schedule.get('/upcoming', async (c) => {
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

    const scheduled = await c.env.DB.prepare(`
      SELECT 
        e.id, e.title, e.episode_number, e.scheduled_at,
        s.title as series_title, s.type
      FROM episodes e
      JOIN series s ON e.series_id = s.id
      WHERE s.studio_id = ? 
        AND e.status = 'scheduled'
        AND e.deleted_at IS NULL
      ORDER BY e.scheduled_at ASC
      LIMIT 50
    `).bind(studio.id).all()

    return c.json(scheduled.results || [])
  } catch (error) {
    console.error('Get scheduled error:', error)
    return c.json({ error: 'Failed to get scheduled items' }, 500)
  }
})

export default schedule