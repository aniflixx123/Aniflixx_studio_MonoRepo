import { Hono } from 'hono'
import { Bindings } from '../types'

const analytics = new Hono<{ Bindings: Bindings }>()

// Get overview analytics
analytics.get('/overview', async (c) => {
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

    const stats = await c.env.DB.prepare(`
      SELECT 
        COUNT(DISTINCT s.id) as total_series,
        COUNT(DISTINCT e.id) as total_episodes,
        COUNT(DISTINCT CASE WHEN e.status = 'published' THEN e.id END) as published_episodes,
        COUNT(DISTINCT CASE WHEN e.status = 'scheduled' THEN e.id END) as scheduled_episodes,
        SUM(e.view_count) as total_views,
        SUM(e.like_count) as total_likes
      FROM series s
      LEFT JOIN episodes e ON s.id = e.series_id
      WHERE s.studio_id = ? AND s.deleted_at IS NULL
    `).bind(studio.id).first()

    return c.json({ analytics: stats })
  } catch (error) {
    console.error('Get analytics error:', error)
    return c.json({ error: 'Failed to get analytics' }, 500)
  }
})

// Get series-specific analytics
analytics.get('/series/:id', async (c) => {
  const seriesId = c.req.param('id')
  const orgId = c.req.header('X-Org-Id')
  
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  try {
    const stats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_episodes,
        SUM(view_count) as total_views,
        AVG(view_count) as avg_views_per_episode,
        SUM(like_count) as total_likes,
        MAX(view_count) as most_viewed_episode_views
      FROM episodes
      WHERE series_id = ? AND deleted_at IS NULL
    `).bind(seriesId).first()

    return c.json({ analytics: stats })
  } catch (error) {
    console.error('Get series analytics error:', error)
    return c.json({ error: 'Failed to get analytics' }, 500)
  }
})

export default analytics
