import { Hono } from 'hono'
import { Bindings } from '../types'

const regions = new Hono<{ Bindings: Bindings }>()

// Set regional availability
regions.post('/series/:id', async (c) => {
  const orgId = c.req.header('X-Org-Id')
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  const seriesId = c.req.param('id')
  const { countries, available_from, available_until, is_available = true } = await c.req.json()

  try {
    const studio = await c.env.DB.prepare(
      'SELECT id FROM studios WHERE clerk_org_id = ?'
    ).bind(orgId).first()

    if (!studio) {
      return c.json({ error: 'Studio not found' }, 404)
    }

    // Verify series ownership
    const series = await c.env.DB.prepare(
      'SELECT id FROM series WHERE id = ? AND studio_id = ?'
    ).bind(seriesId, studio.id).first()

    if (!series) {
      return c.json({ error: 'Series not found or unauthorized' }, 404)
    }

    // Insert or update regional availability
    for (const country of countries) {
      await c.env.DB.prepare(`
        INSERT INTO regional_availability (
          series_id, country_code, is_available, 
          available_from, available_until
        ) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(series_id, episode_id, country_code) 
        DO UPDATE SET 
          is_available = excluded.is_available,
          available_from = excluded.available_from,
          available_until = excluded.available_until,
          updated_at = CURRENT_TIMESTAMP
      `).bind(
        seriesId, 
        country, 
        is_available ? 1 : 0,
        available_from || null,
        available_until || null
      ).run()
    }

    return c.json({ success: true, message: 'Regional settings updated' })
  } catch (error) {
    console.error('Set regions error:', error)
    return c.json({ error: 'Failed to set regions' }, 500)
  }
})

export default regions