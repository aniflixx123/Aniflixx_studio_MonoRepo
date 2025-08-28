import { Hono } from 'hono'
import { Bindings } from '../types'

const series = new Hono<{ Bindings: Bindings }>()

// Get all series for a studio
series.get('/', async (c) => {
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

    const allSeries = await c.env.DB.prepare(
      'SELECT * FROM series WHERE studio_id = ? AND deleted_at IS NULL ORDER BY created_at DESC'
    ).bind(studio.id).all()

    // Parse JSON fields
    const seriesWithParsedData = allSeries.results?.map((s: any) => ({
      ...s,
      genres: s.genres ? JSON.parse(s.genres) : [],
      tags: s.tags ? JSON.parse(s.tags) : []
    }))

    return c.json(seriesWithParsedData || [])
  } catch (error) {
    console.error('Get series error:', error)
    return c.json({ error: 'Failed to fetch series' }, 500)
  }
})

// Create new series
series.post('/', async (c) => {
  const orgId = c.req.header('X-Org-Id')
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  const body = await c.req.json()
  const { title, title_english, title_japanese, type, description, genres, tags } = body

  try {
    // Get studio
    let studio:any = await c.env.DB.prepare(
      'SELECT id FROM studios WHERE clerk_org_id = ?'
    ).bind(orgId).first()

    if (!studio) {
      // Create studio if doesn't exist
      const newStudio = await c.env.DB.prepare(
        'INSERT INTO studios (clerk_org_id, name, slug) VALUES (?, ?, ?) RETURNING id'
      ).bind(orgId, `Studio ${orgId}`, `studio-${orgId}`).first()
      studio = newStudio
    }

    // Create series
    const result = await c.env.DB.prepare(`
      INSERT INTO series (
        studio_id, title, title_english, title_japanese, 
        type, description, genres, tags, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')
      RETURNING *
    `).bind(
      studio.id,
      title,
      title_english || null,
      title_japanese || null,
      type,
      description || null,
      JSON.stringify(genres || []),
      JSON.stringify(tags || [])
    ).first()

    return c.json(result)
  } catch (error) {
    console.error('Create series error:', error)
    return c.json({ error: 'Failed to create series' }, 500)
  }
})

// Get single series
series.get('/:id', async (c) => {
  const seriesId = c.req.param('id')
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

    const series = await c.env.DB.prepare(
      'SELECT * FROM series WHERE id = ? AND studio_id = ?'
    ).bind(seriesId, studio.id).first()

    if (!series) {
      return c.json({ error: 'Series not found' }, 404)
    }

    // Parse JSON fields
    if (series.genres) {
      series.genres = JSON.parse(series.genres as string)
    }
    if (series.tags) {
      series.tags = JSON.parse(series.tags as string)
    }

    return c.json(series)
  } catch (error) {
    console.error('Get series error:', error)
    return c.json({ error: 'Failed to fetch series' }, 500)
  }
})

// Update series
series.put('/:id', async (c) => {
  const seriesId = c.req.param('id')
  const orgId = c.req.header('X-Org-Id')
  
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  const body = await c.req.json()
  const { title, title_english, title_japanese, description, status, genres, tags } = body

  try {
    const studio = await c.env.DB.prepare(
      'SELECT id FROM studios WHERE clerk_org_id = ?'
    ).bind(orgId).first()

    if (!studio) {
      return c.json({ error: 'Studio not found' }, 404)
    }

    const result = await c.env.DB.prepare(`
      UPDATE series 
      SET title = ?, title_english = ?, title_japanese = ?, 
          description = ?, status = ?, genres = ?, tags = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND studio_id = ?
      RETURNING *
    `).bind(
      title,
      title_english || null,
      title_japanese || null,
      description || null,
      status || 'draft',
      JSON.stringify(genres || []),
      JSON.stringify(tags || []),
      seriesId,
      studio.id
    ).first()

    if (!result) {
      return c.json({ error: 'Series not found or unauthorized' }, 404)
    }

    return c.json(result)
  } catch (error) {
    console.error('Update series error:', error)
    return c.json({ error: 'Failed to update series' }, 500)
  }
})

// Delete series (soft delete)
series.delete('/:id', async (c) => {
  const seriesId = c.req.param('id')
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

    const result = await c.env.DB.prepare(`
      UPDATE series 
      SET deleted_at = CURRENT_TIMESTAMP, status = 'archived'
      WHERE id = ? AND studio_id = ?
      RETURNING id
    `).bind(seriesId, studio.id).first()

    if (!result) {
      return c.json({ error: 'Series not found or unauthorized' }, 404)
    }

    return c.json({ success: true, message: 'Series deleted successfully' })
  } catch (error) {
    console.error('Delete series error:', error)
    return c.json({ error: 'Failed to delete series' }, 500)
  }
})

// Get series episodes
series.get('/:id/episodes', async (c) => {
  const seriesId = c.req.param('id')
  
  try {
    const episodes = await c.env.DB.prepare(
      'SELECT * FROM episodes WHERE series_id = ? AND deleted_at IS NULL ORDER BY episode_number'
    ).bind(seriesId).all()

    return c.json(episodes.results || [])
  } catch (error) {
    console.error('Get series episodes error:', error)
    return c.json({ error: 'Failed to fetch episodes' }, 500)
  }
})

// Create season for series
series.post('/:id/seasons', async (c) => {
  const seriesId = c.req.param('id')
  const body = await c.req.json()
  const { season_number, title, description } = body

  try {
    const result = await c.env.DB.prepare(`
      INSERT INTO seasons (series_id, season_number, title, description)
      VALUES (?, ?, ?, ?)
      RETURNING id
    `).bind(seriesId, season_number, title, description || null).first()

    return c.json({ id: result?.id, message: 'Season created successfully' })
  } catch (error) {
    console.error('Create season error:', error)
    return c.json({ error: 'Failed to create season' }, 500)
  }
})

// Get seasons for series
series.get('/:id/seasons', async (c) => {
  const seriesId = c.req.param('id')
  
  try {
    const seasons = await c.env.DB.prepare(
      'SELECT * FROM seasons WHERE series_id = ? ORDER BY season_number'
    ).bind(seriesId).all()

    return c.json(seasons.results || [])
  } catch (error) {
    console.error('Get seasons error:', error)
    return c.json({ error: 'Failed to fetch seasons' }, 500)
  }
})

export default series