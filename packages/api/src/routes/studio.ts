import { Hono } from 'hono'
import { Bindings } from '../types'

const studio = new Hono<{ Bindings: Bindings }>()

// Get studio by clerk org ID
studio.get('/:orgId', async (c) => {
  const orgId = c.req.param('orgId')
  
  try {
    const studio = await c.env.DB.prepare(
      'SELECT * FROM studios WHERE clerk_org_id = ?'
    ).bind(orgId).first()
    
    if (!studio) {
      return c.json({ error: 'Studio not found' }, 404)
    }
    
    return c.json(studio)
  } catch (error) {
    console.error('Get studio error:', error)
    return c.json({ error: 'Database error' }, 500)
  }
})

// Create studio record
studio.post('/', async (c) => {
  const body = await c.req.json()
  const { orgId, name, slug } = body
  
  try {
    const result = await c.env.DB.prepare(
      'INSERT INTO studios (clerk_org_id, name, slug) VALUES (?, ?, ?) RETURNING *'
    ).bind(orgId, name, slug).first()
    
    return c.json(result)
  } catch (error) {
    console.error('Create studio error:', error)
    return c.json({ error: 'Failed to create studio' }, 500)
  }
})

// Update studio settings
studio.put('/:orgId', async (c) => {
  const orgId = c.req.param('orgId')
  const body = await c.req.json()
  
  try {
    // Build dynamic update query based on provided fields
    const updateFields = []
    const values = []
    
    if (body.name) {
      updateFields.push('name = ?')
      values.push(body.name)
    }
    if (body.watermark_url) {
      updateFields.push('watermark_url = ?')
      values.push(body.watermark_url)
    }
    if (body.brand_color) {
      updateFields.push('brand_color = ?')
      values.push(body.brand_color)
    }
    if (body.logo_url) {
      updateFields.push('logo_url = ?')
      values.push(body.logo_url)
    }
    
    if (updateFields.length === 0) {
      return c.json({ error: 'No fields to update' }, 400)
    }
    
    values.push(orgId) // Add orgId for WHERE clause
    
    const result = await c.env.DB.prepare(
      `UPDATE studios SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE clerk_org_id = ? RETURNING *`
    ).bind(...values).first()
    
    if (!result) {
      return c.json({ error: 'Studio not found' }, 404)
    }
    
    return c.json(result)
  } catch (error) {
    console.error('Update studio error:', error)
    return c.json({ error: 'Failed to update studio' }, 500)
  }
})

// Get studio stats
studio.get('/:orgId/stats', async (c) => {
  const orgId = c.req.param('orgId')
  
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
        COUNT(DISTINCT CASE WHEN s.type = 'anime' THEN s.id END) as anime_series,
        COUNT(DISTINCT CASE WHEN s.type = 'manga' THEN s.id END) as manga_series,
        COUNT(DISTINCT CASE WHEN s.type = 'webtoon' THEN s.id END) as webtoon_series,
        COUNT(DISTINCT CASE WHEN e.status = 'published' THEN e.id END) as published_episodes,
        COUNT(DISTINCT CASE WHEN e.status = 'draft' THEN e.id END) as draft_episodes
      FROM series s
      LEFT JOIN episodes e ON s.id = e.series_id
      WHERE s.studio_id = ? AND s.deleted_at IS NULL
    `).bind(studio.id).first()
    
    return c.json(stats)
  } catch (error) {
    console.error('Get studio stats error:', error)
    return c.json({ error: 'Failed to get stats' }, 500)
  }
})

export default studio