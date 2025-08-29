// packages/api/src/routes/regions.ts
import { Hono } from 'hono'
import { Bindings } from '../types'

const regions = new Hono<{ Bindings: Bindings }>()

// Set regional availability for series
regions.post('/series/:seriesId/regions', async (c) => {
  const seriesId = c.req.param('seriesId')
  const orgId = c.req.header('X-Org-Id')
  
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  const body = await c.req.json()
  const { countries, is_available } = body

  try {
    const studio = await c.env.DB.prepare(
      'SELECT id FROM studios WHERE clerk_org_id = ?'
    ).bind(orgId).first()

    if (!studio) {
      return c.json({ error: 'Studio not found' }, 404)
    }

    // Clear existing regions
    await c.env.DB.prepare(
      'DELETE FROM regional_availability WHERE series_id = ?'
    ).bind(seriesId).run()

    // Insert new regions
    if (countries && countries.length > 0) {
      for (const country of countries) {
        await c.env.DB.prepare(`
          INSERT INTO regional_availability (
            series_id, 
            country_code, 
            is_available
          ) VALUES (?, ?, ?)
        `).bind(seriesId, country, is_available ? 1 : 0).run()
      }
    }

    return c.json({ 
      success: true, 
      message: 'Regional settings updated',
      countries: countries.length 
    })
  } catch (error) {
    console.error('Set regions error:', error)
    return c.json({ error: 'Failed to set regions' }, 500)
  }
})

// Set regional availability for episode
regions.post('/episodes/:episodeId/regions', async (c) => {
  const episodeId = c.req.param('episodeId')
  const orgId = c.req.header('X-Org-Id')
  
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  const body = await c.req.json()
  const { countries, is_available } = body

  try {
    const studio = await c.env.DB.prepare(
      'SELECT id FROM studios WHERE clerk_org_id = ?'
    ).bind(orgId).first()

    if (!studio) {
      return c.json({ error: 'Studio not found' }, 404)
    }

    // Verify episode ownership
    const ownership = await c.env.DB.prepare(`
      SELECT e.id 
      FROM episodes e
      JOIN series s ON e.series_id = s.id
      WHERE e.id = ? AND s.studio_id = ?
    `).bind(episodeId, studio.id).first()

    if (!ownership) {
      return c.json({ error: 'Episode not found or unauthorized' }, 404)
    }

    // Clear existing regions for this episode
    await c.env.DB.prepare(
      'DELETE FROM regional_availability WHERE episode_id = ?'
    ).bind(episodeId).run()

    // Insert new regions
    if (countries && countries.length > 0) {
      for (const country of countries) {
        await c.env.DB.prepare(`
          INSERT INTO regional_availability (
            episode_id, 
            country_code, 
            is_available
          ) VALUES (?, ?, ?)
        `).bind(episodeId, country, is_available ? 1 : 0).run()
      }
    }

    return c.json({ 
      success: true, 
      message: 'Episode regional settings updated',
      countries: countries.length 
    })
  } catch (error) {
    console.error('Set episode regions error:', error)
    return c.json({ error: 'Failed to set regions' }, 500)
  }
})

// Get regional availability for series
regions.get('/series/:seriesId/regions', async (c) => {
  const seriesId = c.req.param('seriesId')

  try {
    const regions = await c.env.DB.prepare(`
      SELECT country_code, is_available
      FROM regional_availability
      WHERE series_id = ?
    `).bind(seriesId).all()

    return c.json({
      series_id: seriesId,
      regions: regions.results || []
    })
  } catch (error) {
    console.error('Get regions error:', error)
    return c.json({ error: 'Failed to get regions' }, 500)
  }
})

// Get regional availability for episode
regions.get('/episodes/:episodeId/regions', async (c) => {
  const episodeId = c.req.param('episodeId')

  try {
    const regions = await c.env.DB.prepare(`
      SELECT country_code, is_available
      FROM regional_availability
      WHERE episode_id = ?
    `).bind(episodeId).all()

    return c.json({
      episode_id: episodeId,
      regions: regions.results || []
    })
  } catch (error) {
    console.error('Get episode regions error:', error)
    return c.json({ error: 'Failed to get regions' }, 500)
  }
})

export default regions