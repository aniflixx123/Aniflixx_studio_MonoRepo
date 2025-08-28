import { D1Database, R2Bucket } from '@cloudflare/workers-types'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database
  CONTENT: R2Bucket
  CLERK_SECRET_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for dashboard
app.use('/*', cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}))

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', message: 'API is running' })
})

// ============= STUDIO ENDPOINTS =============

// Get studio by clerk org ID
app.get('/api/studio/:orgId', async (c) => {
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
    return c.json({ error: 'Database error' }, 500)
  }
})

// Create studio record
app.post('/api/studio', async (c) => {
  const body = await c.req.json()
  const { orgId, name, slug } = body
  
  try {
    const result = await c.env.DB.prepare(
      'INSERT INTO studios (clerk_org_id, name, slug) VALUES (?, ?, ?) RETURNING *'
    ).bind(orgId, name, slug).first()
    
    return c.json(result)
  } catch (error) {
    return c.json({ error: 'Failed to create studio' }, 500)
  }
})

// ============= SERIES ENDPOINTS =============

// Create series
app.post('/api/series', async (c) => {
  const orgId = c.req.header('X-Org-Id')
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  const body = await c.req.json()
  const { title, title_english, title_japanese, type, description, genres, tags } = body

  try {
    // First get the studio ID from org ID
    let studio = await c.env.DB.prepare(
      'SELECT id FROM studios WHERE clerk_org_id = ?'
    ).bind(orgId).first()

    if (!studio) {
      // Create studio if doesn't exist
      const newStudio = await c.env.DB.prepare(
        'INSERT INTO studios (clerk_org_id, name, slug) VALUES (?, ?, ?) RETURNING id'
      ).bind(orgId, title, title.toLowerCase().replace(/\s+/g, '-')).first()
      
      studio = newStudio
    }

    if (!studio) {
      return c.json({ error: 'Failed to create or find studio' }, 500)
    }

    // Create the series
    const result = await c.env.DB.prepare(`
      INSERT INTO series (
        studio_id, title, title_english, title_japanese, 
        type, description, genres, tags, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')
      RETURNING id
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

    if (!result) {
      return c.json({ error: 'Failed to create series' }, 500)
    }

    return c.json({ id: result.id, message: 'Series created successfully' })
  } catch (error) {
    console.error('Error creating series:', error)
    return c.json({ error: 'Failed to create series' }, 500)
  }
})

// Get all series for a studio
app.get('/api/series', async (c) => {
  const orgId = c.req.query('orgId')
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  try {
    // Get studio
    const studio = await c.env.DB.prepare(
      'SELECT id FROM studios WHERE clerk_org_id = ?'
    ).bind(orgId).first()

    if (!studio) {
      return c.json({ series: [] })
    }

    // Get all series for this studio
    const series = await c.env.DB.prepare(
      'SELECT * FROM series WHERE studio_id = ? ORDER BY created_at DESC'
    ).bind(studio.id).all()

    return c.json({ series: series.results })
  } catch (error) {
    console.error('Error fetching series:', error)
    return c.json({ error: 'Failed to fetch series' }, 500)
  }
})

// Get single series details
app.get('/api/series/:id', async (c) => {
  const seriesId = c.req.param('id')
  const orgId = c.req.query('orgId')
  
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  try {
    // Get studio first to verify ownership
    const studio = await c.env.DB.prepare(
      'SELECT id FROM studios WHERE clerk_org_id = ?'
    ).bind(orgId).first()

    if (!studio) {
      return c.json({ error: 'Studio not found' }, 404)
    }

    // Get the series
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
    console.error('Error fetching series:', error)
    return c.json({ error: 'Failed to fetch series' }, 500)
  }
})
app.post('/api/series/:seriesId/seasons', async (c) => {
  const seriesId = c.req.param('seriesId')
  const orgId = c.req.header('X-Org-Id')
  
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

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
    console.error('Error creating season:', error)
    return c.json({ error: 'Failed to create season' }, 500)
  }
})

// Update series
app.put('/api/series/:id', async (c) => {
  const seriesId = c.req.param('id')
  const orgId = c.req.header('X-Org-Id')
  
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  const body = await c.req.json()
  const { title, title_english, title_japanese, description, status, genres, tags } = body

  try {
    // Verify ownership
    const studio = await c.env.DB.prepare(
      'SELECT id FROM studios WHERE clerk_org_id = ?'
    ).bind(orgId).first()

    if (!studio) {
      return c.json({ error: 'Studio not found' }, 404)
    }

    const result = await c.env.DB.prepare(`
      UPDATE series 
      SET title = ?, title_english = ?, title_japanese = ?, 
          description = ?, status = ?, genres = ?, tags = ?
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
    console.error('Error updating series:', error)
    return c.json({ error: 'Failed to update series' }, 500)
  }
})

// ============= SEASON ENDPOINTS =============

// Create season
app.post('/api/series/:seriesId/seasons', async (c) => {
  const seriesId = c.req.param('seriesId')
  const orgId = c.req.header('X-Org-Id')
  
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

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
    console.error('Error creating season:', error)
    return c.json({ error: 'Failed to create season' }, 500)
  }
})

// Get seasons for a series
app.get('/api/series/:seriesId/seasons', async (c) => {
  const seriesId = c.req.param('seriesId')
  
  try {
    const seasons = await c.env.DB.prepare(
      'SELECT * FROM seasons WHERE series_id = ? ORDER BY season_number ASC'
    ).bind(seriesId).all()

    return c.json({ seasons: seasons.results })
  } catch (error) {
    console.error('Error fetching seasons:', error)
    return c.json({ error: 'Failed to fetch seasons' }, 500)
  }
})

// ============= EPISODE ENDPOINTS =============

// Upload file and create episode
app.post('/api/upload', async (c) => {
  console.log('Upload endpoint hit')
  
  const orgId = c.req.header('X-Org-Id')
  console.log('Org ID:', orgId)
  
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  try {
    // Get form data
    const formData = await c.req.formData()
    const file = formData.get('file') as File
    const seriesId = formData.get('seriesId') as string
    const seasonId = formData.get('seasonId') as string
    const episodeNumber = formData.get('episodeNumber') as string
    const episodeTitle = formData.get('episodeTitle') as string
    const description = formData.get('description') as string
    const fileName = formData.get('fileName') as string
    
    console.log('Episode info:', {
      seriesId,
      seasonId,
      episodeNumber,
      episodeTitle,
      fileName,
      fileSize: file?.size
    })
    
    if (!file || !seriesId || !episodeNumber || !episodeTitle) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    // Generate unique key for R2
    const timestamp = Date.now()
    const key = `studios/${orgId}/series/${seriesId}/episode-${episodeNumber}/${timestamp}-${fileName}`
    console.log('Uploading to R2 with key:', key)

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer()
    const result = await c.env.CONTENT.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      }
    })
    
    console.log('R2 upload complete')

    // Save episode data to database
    const episodeResult = await c.env.DB.prepare(`
      INSERT INTO episodes (
        series_id, 
        season_id,
        episode_number, 
        title, 
        description, 
        video_path,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, 'published')
      RETURNING id
    `).bind(
      seriesId,
      seasonId || null,
      parseInt(episodeNumber),
      episodeTitle,
      description || null,
      key
    ).first()

    console.log('Episode saved to database:', episodeResult)

    return c.json({ 
      success: true,
      episodeId: episodeResult?.id,
      key,
      size: file.size,
      url: `/api/files/${key}`
    })
  } catch (error) {
    console.error('Upload error details:', error)
    return c.json({ 
      error: 'Upload failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, 500)
  }
})
// Upload chapter with multiple images (for manga/webtoon)
app.post('/api/upload-chapter', async (c) => {
  const orgId = c.req.header('X-Org-Id')
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  try {
    const formData = await c.req.formData()
    const seriesId = formData.get('seriesId') as string
    const chapterNumber = formData.get('chapterNumber') as string
    const chapterTitle = formData.get('chapterTitle') as string
    const description = formData.get('description') as string
    const totalPages = parseInt(formData.get('totalPages') as string)
    const contentType = formData.get('contentType') as string

    if (!seriesId || !chapterNumber || !chapterTitle || totalPages === 0) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    // Upload all pages to R2
    const pageKeys: string[] = []
    
    for (let i = 0; i < totalPages; i++) {
      const pageFile = formData.get(`page_${i}`) as File
      if (pageFile) {
        const timestamp = Date.now()
        const key = `studios/${orgId}/series/${seriesId}/chapter-${chapterNumber}/page-${i + 1}-${timestamp}.jpg`
        
        const arrayBuffer = await pageFile.arrayBuffer()
        await c.env.CONTENT.put(key, arrayBuffer, {
          httpMetadata: {
            contentType: pageFile.type,
          }
        })
        
        pageKeys.push(key)
      }
    }

    // Save chapter data to database
    // Store page keys as JSON in video_path column
    const episodeResult = await c.env.DB.prepare(`
      INSERT INTO episodes (
        series_id,
        episode_number, 
        title, 
        description, 
        video_path,  -- Using this to store page keys for manga
        status
      ) VALUES (?, ?, ?, ?, ?, 'published')
      RETURNING id
    `).bind(
      seriesId,
      parseInt(chapterNumber),
      chapterTitle,
      description || null,
      JSON.stringify(pageKeys)  // Store all page keys as JSON
    ).first()

    return c.json({ 
      success: true,
      episodeId: episodeResult?.id,
      totalPages: pageKeys.length,
      message: `Chapter ${chapterNumber} uploaded with ${pageKeys.length} pages`
    })
  } catch (error) {
    console.error('Chapter upload error:', error)
    return c.json({ 
      error: 'Upload failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, 500)
  }
})
// Get single episode/chapter details
app.get('/api/episodes/:id', async (c) => {
  const episodeId = c.req.param('id')
  
  try {
    const episode = await c.env.DB.prepare(
      'SELECT * FROM episodes WHERE id = ?'
    ).bind(episodeId).first()

    if (!episode) {
      return c.json({ error: 'Episode not found' }, 404)
    }

    return c.json(episode)
  } catch (error) {
    console.error('Error fetching episode:', error)
    return c.json({ error: 'Failed to fetch episode' }, 500)
  }
})
// Get episodes for a series
app.get('/api/series/:id/episodes', async (c) => {
  const seriesId = c.req.param('id')
  
  try {
    const episodes = await c.env.DB.prepare(
      'SELECT * FROM episodes WHERE series_id = ? ORDER BY episode_number ASC'
    ).bind(seriesId).all()

    return c.json({ episodes: episodes.results })
  } catch (error) {
    console.error('Error fetching episodes:', error)
    return c.json({ error: 'Failed to fetch episodes' }, 500)
  }
})

// Update episode status
app.patch('/api/episodes/:id/status', async (c) => {
  const episodeId = c.req.param('id')
  const { status } = await c.req.json()
  
  try {
    const result = await c.env.DB.prepare(
      'UPDATE episodes SET status = ?, published_at = ? WHERE id = ? RETURNING *'
    ).bind(
      status, 
      status === 'published' ? new Date().toISOString() : null,
      episodeId
    ).first()

    if (!result) {
      return c.json({ error: 'Episode not found' }, 404)
    }

    return c.json(result)
  } catch (error) {
    console.error('Error updating episode:', error)
    return c.json({ error: 'Failed to update episode' }, 500)
  }
})

// Delete episode
app.delete('/api/episodes/:id', async (c) => {
  const episodeId = c.req.param('id')
  const orgId = c.req.header('X-Org-Id')
  
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  try {
    // Get episode to find the file key
    const episode = await c.env.DB.prepare(
      'SELECT video_path FROM episodes WHERE id = ?'
    ).bind(episodeId).first()

    if (episode && episode.video_path) {
      // Delete from R2
      await c.env.CONTENT.delete(episode.video_path as string)
    }

    // Delete from database
    await c.env.DB.prepare(
      'DELETE FROM episodes WHERE id = ?'
    ).bind(episodeId).run()

    return c.json({ message: 'Episode deleted successfully' })
  } catch (error) {
    console.error('Error deleting episode:', error)
    return c.json({ error: 'Failed to delete episode' }, 500)
  }
})

// ============= TEAM ENDPOINTS =============

// Get team members
app.get('/api/team', async (c) => {
  const orgId = c.req.header('X-Org-Id')
  
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  try {
    const studio = await c.env.DB.prepare(
      'SELECT id FROM studios WHERE clerk_org_id = ?'
    ).bind(orgId).first()

    if (!studio) {
      return c.json({ team: [] })
    }

    const team = await c.env.DB.prepare(
      'SELECT * FROM team_members WHERE studio_id = ? ORDER BY created_at DESC'
    ).bind(studio.id).all()

    return c.json({ team: team.results })
  } catch (error) {
    console.error('Error fetching team:', error)
    return c.json({ error: 'Failed to fetch team' }, 500)
  }
})

// Add team member
app.post('/api/team', async (c) => {
  const orgId = c.req.header('X-Org-Id')
  
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  const { user_id, email, role } = await c.req.json()

  try {
    const studio = await c.env.DB.prepare(
      'SELECT id, max_users FROM studios WHERE clerk_org_id = ?'
    ).bind(orgId).first() as { id: string; max_users: number } | null

    if (!studio) {
      return c.json({ error: 'Studio not found' }, 404)
    }

    // Check team size limit
    const currentTeam = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM team_members WHERE studio_id = ?'
    ).bind(studio.id).first() as { count: number } | null

    if (currentTeam && currentTeam.count >= studio.max_users) {
      return c.json({ error: 'Team size limit reached' }, 403)
    }

    const result = await c.env.DB.prepare(
      'INSERT INTO team_members (studio_id, user_id, email, role) VALUES (?, ?, ?, ?) RETURNING *'
    ).bind(studio.id, user_id, email, role || 'uploader').first()

    return c.json(result)
  } catch (error) {
    console.error('Error adding team member:', error)
    return c.json({ error: 'Failed to add team member' }, 500)
  }
})

// ============= FILE MANAGEMENT =============

// Serve files from R2
app.get('/api/files/*', async (c) => {
  const key = c.req.path.replace('/api/files/', '')
  
  try {
    const object = await c.env.CONTENT.get(key)
    
    if (!object) {
      return c.json({ error: 'File not found' }, 404)
    }
    
    const arrayBuffer = await object.arrayBuffer()
    
    return c.newResponse(arrayBuffer, {
      headers: {
        'content-type': object.httpMetadata?.contentType || 'application/octet-stream',
        'etag': object.httpEtag,
        'cache-control': 'public, max-age=3600'
      }
    })
  } catch (error) {
    return c.json({ error: 'Failed to retrieve file' }, 500)
  }
})

// List files for a studio
app.get('/api/files/list', async (c) => {
  const orgId = c.req.header('X-Org-Id')
  
  try {
    const prefix = orgId ? `studios/${orgId}/` : ''
    const objects = await c.env.CONTENT.list({
      prefix: prefix,
      limit: 100
    })

    const files = objects.objects.map(obj => ({
      key: obj.key,
      size: obj.size,
      uploaded: obj.uploaded,
      httpEtag: obj.httpEtag
    }))

    return c.json({ 
      files,
      count: files.length,
      truncated: objects.truncated,
      prefix: prefix
    })
  } catch (error) {
    console.error('Error listing files:', error)
    return c.json({ error: 'Failed to list files' }, 500)
  }
})

// Test R2 upload
app.get('/api/test-r2', async (c) => {
  try {
    const testKey = 'test/test-file.txt'
    const testContent = 'Hello from R2 test at ' + new Date().toISOString()
    
    const result = await c.env.CONTENT.put(testKey, testContent)
    
    const object = await c.env.CONTENT.get(testKey)
    if (object) {
      const text = await object.text()
      return c.json({ 
        success: true, 
        message: 'R2 is working!',
        content: text,
        key: testKey
      })
    } else {
      return c.json({ 
        success: false, 
        message: 'Upload succeeded but could not read back'
      })
    }
  } catch (error) {
    console.error('R2 test error:', error)
    return c.json({ 
      error: 'R2 test failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})
// ============= ENHANCED SERIES ENDPOINTS =============

// Update series (enhanced version with more fields)
app.put('/api/series/:id', async (c) => {
  const orgId = c.req.header('X-Org-Id')
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  const seriesId = c.req.param('id')
  const updates = await c.req.json()

  try {
    // Build update query dynamically
    const allowedFields = [
      'title', 'title_english', 'title_japanese', 'description', 
      'status', 'genres', 'tags', 'content_rating', 'target_audience',
      'is_premium', 'is_featured', 'is_exclusive', 'release_schedule',
      'release_day', 'release_time', 'release_timezone'
    ]
    
    const setClause = []
    const values = []
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClause.push(`${field} = ?`)
        values.push(
          typeof updates[field] === 'object' 
            ? JSON.stringify(updates[field]) 
            : updates[field]
        )
      }
    }
    
    if (setClause.length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400)
    }
    
    // Add updated_at
    setClause.push('updated_at = CURRENT_TIMESTAMP')
    
    // Get studio ID
    const studio = await c.env.DB.prepare(
      'SELECT id FROM studios WHERE clerk_org_id = ?'
    ).bind(orgId).first()

    if (!studio) {
      return c.json({ error: 'Studio not found' }, 404)
    }
    
    values.push(seriesId, studio.id)
    
    const result = await c.env.DB.prepare(`
      UPDATE series 
      SET ${setClause.join(', ')}
      WHERE id = ? AND studio_id = ?
      RETURNING *
    `).bind(...values).first()

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
app.delete('/api/series/:id', async (c) => {
  const orgId = c.req.header('X-Org-Id')
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  const seriesId = c.req.param('id')

  try {
    const studio = await c.env.DB.prepare(
      'SELECT id FROM studios WHERE clerk_org_id = ?'
    ).bind(orgId).first()

    if (!studio) {
      return c.json({ error: 'Studio not found' }, 404)
    }

    // Soft delete
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

// ============= ENHANCED EPISODE ENDPOINTS =============

// Update episode with more fields
app.put('/api/episodes/:id', async (c) => {
  const orgId = c.req.header('X-Org-Id')
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  const episodeId = c.req.param('id')
  const updates = await c.req.json()

  try {
    const studio = await c.env.DB.prepare(
      'SELECT id FROM studios WHERE clerk_org_id = ?'
    ).bind(orgId).first()

    if (!studio) {
      return c.json({ error: 'Studio not found' }, 404)
    }

    const allowedFields = [
      'title', 'description', 'episode_number', 'status',
      'is_premium', 'is_early_access', 'scheduled_at', 'available_until'
    ]
    
    const setClause = []
    const values = []
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClause.push(`${field} = ?`)
        values.push(updates[field])
      }
    }
    
    if (setClause.length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400)
    }
    
    setClause.push('updated_at = CURRENT_TIMESTAMP')
    values.push(episodeId, studio.id)
    
    const result = await c.env.DB.prepare(`
      UPDATE episodes 
      SET ${setClause.join(', ')}
      WHERE id = ? AND series_id IN (
        SELECT id FROM series WHERE studio_id = ?
      )
      RETURNING *
    `).bind(...values).first()

    if (!result) {
      return c.json({ error: 'Episode not found or unauthorized' }, 404)
    }

    return c.json(result)
  } catch (error) {
    console.error('Update episode error:', error)
    return c.json({ error: 'Failed to update episode' }, 500)
  }
})

// Enhanced delete episode (with R2 cleanup)
app.delete('/api/episodes/:id', async (c) => {
  const orgId = c.req.header('X-Org-Id')
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  const episodeId = c.req.param('id')

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
        if (videoPath.startsWith('[')) {
          const paths = JSON.parse(videoPath)
          for (const path of paths) {
            await c.env.CONTENT.delete(path)
          }
        } else {
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

// ============= REGIONAL AVAILABILITY ENDPOINTS =============

// Set regional availability for series
app.post('/api/series/:id/regions', async (c) => {
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

    // Insert or update regional availability for each country
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

    return c.json({ success: true, message: 'Regional availability updated' })
  } catch (error) {
    console.error('Set regions error:', error)
    return c.json({ error: 'Failed to set regional availability' }, 500)
  }
})

// Get regional availability for series
app.get('/api/series/:id/regions', async (c) => {
  const seriesId = c.req.param('id')

  try {
    const regions = await c.env.DB.prepare(`
      SELECT country_code, is_available, available_from, available_until
      FROM regional_availability 
      WHERE series_id = ? AND episode_id IS NULL
      ORDER BY country_code
    `).bind(seriesId).all()

    return c.json({ regions: regions.results })
  } catch (error) {
    console.error('Get regions error:', error)
    return c.json({ error: 'Failed to get regions' }, 500)
  }
})

// ============= PUBLISHING QUEUE ENDPOINTS =============

// Schedule episode publish
app.post('/api/episodes/:id/schedule', async (c) => {
  const orgId = c.req.header('X-Org-Id')
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  const episodeId = c.req.param('id')
  const { scheduled_at, timezone = 'UTC' } = await c.req.json()

  try {
    const studio = await c.env.DB.prepare(
      'SELECT id FROM studios WHERE clerk_org_id = ?'
    ).bind(orgId).first()

    if (!studio) {
      return c.json({ error: 'Studio not found' }, 404)
    }

    // Add to publish queue
    await c.env.DB.prepare(`
      INSERT INTO publish_queue (
        episode_id, action, scheduled_at, timezone, status, created_by
      ) VALUES (?, 'publish', ?, ?, 'pending', ?)
    `).bind(episodeId, scheduled_at, timezone, orgId).run()

    // Update episode status
    await c.env.DB.prepare(`
      UPDATE episodes 
      SET status = 'scheduled', scheduled_at = ?
      WHERE id = ?
    `).bind(scheduled_at, episodeId).run()

    return c.json({ success: true, message: 'Episode scheduled successfully' })
  } catch (error) {
    console.error('Schedule error:', error)
    return c.json({ error: 'Failed to schedule episode' }, 500)
  }
})

// Get scheduled episodes
app.get('/api/schedule', async (c) => {
  const orgId = c.req.header('X-Org-Id')
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  try {
    const studio = await c.env.DB.prepare(
      'SELECT id FROM studios WHERE clerk_org_id = ?'
    ).bind(orgId).first()

    if (!studio) {
      return c.json({ scheduled: [] })
    }

    const scheduled = await c.env.DB.prepare(`
      SELECT 
        pq.*,
        e.title as episode_title,
        e.episode_number,
        s.title as series_title
      FROM publish_queue pq
      JOIN episodes e ON pq.episode_id = e.id
      JOIN series s ON e.series_id = s.id
      WHERE s.studio_id = ? 
        AND pq.status = 'pending'
        AND pq.scheduled_at > datetime('now')
      ORDER BY pq.scheduled_at ASC
    `).bind(studio.id).all()

    return c.json({ scheduled: scheduled.results })
  } catch (error) {
    console.error('Get schedule error:', error)
    return c.json({ error: 'Failed to get schedule' }, 500)
  }
})

// Process publish queue (for cron job)
app.post('/api/queue/process', async (c) => {
  try {
    // Get pending items that are due
    const pending = await c.env.DB.prepare(`
      SELECT * FROM publish_queue 
      WHERE status = 'pending' 
        AND scheduled_at <= datetime('now')
      ORDER BY scheduled_at ASC
      LIMIT 10
    `).all()

    let processed = 0
    
    for (const item of pending.results || []) {
      try {
        // Update episode status based on action
        if (item.action === 'publish') {
          await c.env.DB.prepare(`
            UPDATE episodes 
            SET status = 'published', 
                published_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).bind(item.episode_id).run()
        } else if (item.action === 'unpublish') {
          await c.env.DB.prepare(`
            UPDATE episodes 
            SET status = 'hidden'
            WHERE id = ?
          `).bind(item.episode_id).run()
        }

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

// ============= MONETIZATION ENDPOINTS =============

// Set monetization settings for series/episode
app.post('/api/monetization', async (c) => {
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

// ============= ANALYTICS ENDPOINTS =============

// Get basic analytics for studio
app.get('/api/analytics/overview', async (c) => {
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

    // Get overview stats
    const stats = await c.env.DB.prepare(`
      SELECT 
        COUNT(DISTINCT s.id) as total_series,
        COUNT(DISTINCT e.id) as total_episodes,
        COUNT(DISTINCT CASE WHEN e.status = 'published' THEN e.id END) as published_episodes,
        COUNT(DISTINCT CASE WHEN e.status = 'scheduled' THEN e.id END) as scheduled_episodes,
        SUM(e.view_count) as total_views
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

export default app