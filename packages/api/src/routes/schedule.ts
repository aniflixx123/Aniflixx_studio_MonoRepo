// packages/api/src/routes/schedule.ts
import { Hono } from 'hono'
import { Bindings } from '../types'

const schedule = new Hono<{ Bindings: Bindings }>()

// Schedule episode release
schedule.post('/:episodeId/schedule', async (c) => {
  const episodeId = c.req.param('episodeId')
  const orgId = c.req.header('X-Org-Id')
  
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  const body = await c.req.json()
  const { scheduled_at, timezone } = body

  try {
    // Verify ownership
    const studio = await c.env.DB.prepare(
      'SELECT id FROM studios WHERE clerk_org_id = ?'
    ).bind(orgId).first()

    if (!studio) {
      return c.json({ error: 'Studio not found' }, 404)
    }

    // Check episode ownership
    const ownership = await c.env.DB.prepare(`
      SELECT e.id 
      FROM episodes e
      JOIN series s ON e.series_id = s.id
      WHERE e.id = ? AND s.studio_id = ?
    `).bind(episodeId, studio.id).first()

    if (!ownership) {
      return c.json({ error: 'Episode not found or unauthorized' }, 404)
    }

    // Update episode with scheduled time
    await c.env.DB.prepare(`
      UPDATE episodes 
      SET scheduled_at = ?, 
          status = 'scheduled',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(scheduled_at, episodeId).run()

    // Add to publish queue
    await c.env.DB.prepare(`
      INSERT INTO publish_queue (
        episode_id, 
        scheduled_at, 
        timezone,
        status
      ) VALUES (?, ?, ?, 'pending')
      ON CONFLICT(episode_id) DO UPDATE SET
        scheduled_at = excluded.scheduled_at,
        timezone = excluded.timezone,
        status = 'pending',
        updated_at = CURRENT_TIMESTAMP
    `).bind(episodeId, scheduled_at, timezone || 'UTC').run()

    return c.json({ 
      success: true, 
      message: 'Episode scheduled successfully' 
    })
  } catch (error) {
    console.error('Schedule episode error:', error)
    return c.json({ error: 'Failed to schedule episode' }, 500)
  }
})

// Cancel scheduled release
schedule.delete('/:episodeId/schedule', async (c) => {
  const episodeId = c.req.param('episodeId')
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

    // Update episode status
    await c.env.DB.prepare(`
      UPDATE episodes e
      SET scheduled_at = NULL, 
          status = 'draft',
          updated_at = CURRENT_TIMESTAMP
      FROM series s
      WHERE e.id = ? 
        AND e.series_id = s.id 
        AND s.studio_id = ?
    `).bind(episodeId, studio.id).run()

    // Remove from publish queue
    await c.env.DB.prepare(
      'DELETE FROM publish_queue WHERE episode_id = ?'
    ).bind(episodeId).run()

    return c.json({ 
      success: true, 
      message: 'Schedule cancelled' 
    })
  } catch (error) {
    console.error('Cancel schedule error:', error)
    return c.json({ error: 'Failed to cancel schedule' }, 500)
  }
})

// Process scheduled releases (cron job endpoint)
schedule.post('/process', async (c) => {
  try {
    const now = new Date().toISOString()
    
    // Get pending scheduled episodes
    const pending = await c.env.DB.prepare(`
      SELECT pq.*, e.series_id 
      FROM publish_queue pq
      JOIN episodes e ON pq.episode_id = e.id
      WHERE pq.status = 'pending' 
        AND pq.scheduled_at <= ?
      LIMIT 50
    `).bind(now).all()

    let processed = 0
    for (const item of pending.results || []) {
      try {
        // Update episode status
        await c.env.DB.prepare(`
          UPDATE episodes 
          SET status = 'published',
              published_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(item.episode_id).run()

        // Update queue status
        await c.env.DB.prepare(`
          UPDATE publish_queue 
          SET status = 'completed',
              published_at = CURRENT_TIMESTAMP
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

export default schedule