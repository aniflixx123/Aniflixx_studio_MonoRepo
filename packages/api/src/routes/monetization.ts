import { Hono } from 'hono'
import { Bindings } from '../types'

const monetization = new Hono<{ Bindings: Bindings }>()

// Set monetization settings
monetization.post('/', async (c) => {
  const orgId = c.req.header('X-Org-Id')
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  const body = await c.req.json()
  const { 
    series_id, 
    episode_id, 
    monetization_type,
    is_free,
    is_premium,
    early_access_hours,
    preview_duration
  } = body

  try {
    const studio = await c.env.DB.prepare(
      'SELECT id FROM studios WHERE clerk_org_id = ?'
    ).bind(orgId).first()

    if (!studio) {
      return c.json({ error: 'Studio not found' }, 404)
    }

    await c.env.DB.prepare(`
      INSERT INTO content_monetization (
        series_id, episode_id, monetization_type,
        is_free, is_premium, early_access_hours,
        preview_duration, preview_enabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(series_id, episode_id) 
      DO UPDATE SET 
        monetization_type = excluded.monetization_type,
        is_free = excluded.is_free,
        is_premium = excluded.is_premium,
        early_access_hours = excluded.early_access_hours,
        preview_duration = excluded.preview_duration,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      series_id || null,
      episode_id || null,
      monetization_type || 'premium',
      is_free ? 1 : 0,
      is_premium ? 1 : 0,
      early_access_hours || 0,
      preview_duration || null,
      preview_duration ? 1 : 0
    ).run()

    return c.json({ success: true, message: 'Monetization settings updated' })
  } catch (error) {
    console.error('Set monetization error:', error)
    return c.json({ error: 'Failed to set monetization' }, 500)
  }
})

export default monetization
