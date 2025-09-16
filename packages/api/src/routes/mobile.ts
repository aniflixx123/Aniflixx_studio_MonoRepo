// packages/api/src/routes/mobile.ts
import { Hono } from 'hono'
import { Bindings } from '../types'

const mobile = new Hono<{ Bindings: Bindings }>()

// Helper function to construct full R2 URLs
const constructImageUrl = (basePath: string, imagePath: string | null): string | null => {
  if (!imagePath) return null;
  
  // If already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Construct full URL using the API's file serving endpoint
  return `${basePath}/api/files/${imagePath}`;
}

// Helper to transform series data with full image URLs
const transformSeries = (series: any, baseUrl: string) => {
  if (!series) return null;
  
  return {
    ...series,
    cover_image: constructImageUrl(baseUrl, series.cover_image),
    banner_image: constructImageUrl(baseUrl, series.banner_image),
    thumbnail_image: constructImageUrl(baseUrl, series.thumbnail_image),
    logo_image: constructImageUrl(baseUrl, series.logo_image),
    // Parse genres and tags if they're strings
    genres: typeof series.genres === 'string' ? JSON.parse(series.genres || '[]') : series.genres,
    tags: typeof series.tags === 'string' ? JSON.parse(series.tags || '[]') : series.tags,
  };
}

// Helper to transform episode data with full image URLs
const transformEpisode = (episode: any, baseUrl: string) => {
  if (!episode) return null;
  
  const transformed: any = {
    ...episode,
    thumbnail: constructImageUrl(baseUrl, episode.thumbnail),
  };
  
  // Handle manga/webtoon pages
  if (episode.video_path && episode.type !== 'anime') {
    try {
      const parsed = JSON.parse(episode.video_path);
      
      // If it's an array of paths (correct format)
      if (Array.isArray(parsed)) {
        transformed.pages = parsed.map((path: string) => {
          // Convert to full URL
          return `${baseUrl}/api/files/${path}`;
        });
      }
    } catch (e) {
      console.error('Failed to parse video_path:', e);
      transformed.pages = [];
    }
  }
  
  return transformed;
};

// Get series list (public, no auth required)
mobile.get('/series', async (c) => {
  const { type, page = '1', limit = '20', sort = 'view_count', order = 'desc' } = c.req.query()
  const baseUrl = `https://${c.req.header('host') || 'studio-dashboard-api.black-poetry-4fa5.workers.dev'}`
  
  try {
    const offset = (parseInt(page) - 1) * parseInt(limit)
    
    let query;
    let params;
    
    if (type && type !== 'all') {
      query = `
        SELECT s.*, st.name as studio_name 
        FROM series s
        LEFT JOIN studios st ON s.studio_id = st.id
        WHERE s.status = 'published' 
          AND s.type = ?
          AND s.deleted_at IS NULL
        ORDER BY s.${sort} ${order.toUpperCase()}
        LIMIT ? OFFSET ?
      `;
      params = [type, parseInt(limit), offset];
    } else {
      query = `
        SELECT s.*, st.name as studio_name 
        FROM series s
        LEFT JOIN studios st ON s.studio_id = st.id
        WHERE s.status = 'published'
          AND s.type IN ('manga', 'webtoon')
          AND s.deleted_at IS NULL
        ORDER BY s.${sort} ${order.toUpperCase()}
        LIMIT ? OFFSET ?
      `;
      params = [parseInt(limit), offset];
    }
    
    const result = await c.env.DB.prepare(query).bind(...params).all()
    
    // Transform all series to include full image URLs
    const seriesWithUrls = (result.results || []).map(series => transformSeries(series, baseUrl))
    
    return c.json(seriesWithUrls)
  } catch (error) {
    console.error('Mobile series error:', error)
    return c.json({ error: 'Failed to fetch series' }, 500)
  }
})

// Get single series details
mobile.get('/series/:id', async (c) => {
  const seriesId = c.req.param('id')
  const baseUrl = `https://${c.req.header('host') || 'studio-dashboard-api.black-poetry-4fa5.workers.dev'}`
  
  try {
    const series = await c.env.DB.prepare(`
      SELECT s.*, st.name as studio_name 
      FROM series s
      LEFT JOIN studios st ON s.studio_id = st.id
      WHERE s.id = ? 
        AND s.status = 'published'
        AND s.deleted_at IS NULL
    `).bind(seriesId).first()
    
    if (!series) {
      return c.json({ error: 'Series not found' }, 404)
    }
    
    // Transform to include full URLs
    const transformedSeries = transformSeries(series, baseUrl)
    
    return c.json(transformedSeries)
  } catch (error) {
    console.error('Mobile series detail error:', error)
    return c.json({ error: 'Failed to fetch series details' }, 500)
  }
})

// Get chapters for a series - FIXED TO INCLUDE studio_id
mobile.get('/series/:id/chapters', async (c) => {
  const seriesId = c.req.param('id')
  const { page = '1', limit = '50' } = c.req.query()
  const baseUrl = `https://${c.req.header('host') || 'studio-dashboard-api.black-poetry-4fa5.workers.dev'}`
  
  try {
    const offset = (parseInt(page) - 1) * parseInt(limit)
    
    // First get the series type AND studio_id
    const series = await c.env.DB.prepare(
      'SELECT type, studio_id FROM series WHERE id = ?'
    ).bind(seriesId).first()
    
    if (!series) {
      return c.json({ error: 'Series not found' }, 404)
    }
    
    const episodes = await c.env.DB.prepare(`
      SELECT e.*, ? as studio_id
      FROM episodes e
      WHERE e.series_id = ? 
        AND e.status = 'published'
        AND e.deleted_at IS NULL
        AND (e.scheduled_at IS NULL OR e.scheduled_at <= datetime('now'))
      ORDER BY e.episode_number ASC
      LIMIT ? OFFSET ?
    `).bind(series.studio_id, seriesId, parseInt(limit), offset).all()
    
    // Transform episodes with type and studio info
    const transformedEpisodes = (episodes.results || []).map(ep => ({
      ...transformEpisode(ep, baseUrl),
      type: series.type,
      studio_id: series.studio_id
    }))
    
    return c.json(transformedEpisodes)
  } catch (error) {
    console.error('Mobile chapters error:', error)
    return c.json({ error: 'Failed to fetch chapters' }, 500)
  }
})

// Get single chapter/episode details - FIXED TO INCLUDE studio_id
mobile.get('/chapters/:id', async (c) => {
  const chapterId = c.req.param('id')
  const baseUrl = `https://${c.req.header('host') || 'studio-dashboard-api.black-poetry-4fa5.workers.dev'}`
  
  try {
    const episode = await c.env.DB.prepare(`
      SELECT e.*, s.type, s.studio_id 
      FROM episodes e
      JOIN series s ON e.series_id = s.id
      WHERE e.id = ? 
        AND e.status = 'published'
        AND e.deleted_at IS NULL
    `).bind(chapterId).first()
    
    if (!episode) {
      return c.json({ error: 'Chapter not found' }, 404)
    }
    
    // Transform to include full URLs
    const transformedEpisode = transformEpisode(episode, baseUrl)
    
    return c.json(transformedEpisode)
  } catch (error) {
    console.error('Mobile chapter detail error:', error)
    return c.json({ error: 'Failed to fetch chapter details' }, 500)
  }
})

// Search series
mobile.get('/series/search', async (c) => {
  const { q, type, genres, status, page = '1', limit = '20' } = c.req.query()
  const baseUrl = `https://${c.req.header('host') || 'studio-dashboard-api.black-poetry-4fa5.workers.dev'}`
  
  if (!q) {
    return c.json({ error: 'Search query required' }, 400)
  }
  
  try {
    const offset = (parseInt(page) - 1) * parseInt(limit)
    
    let conditions = [
      's.status = "published"',
      's.deleted_at IS NULL',
      '(s.title LIKE ? OR s.title_english LIKE ? OR s.description LIKE ?)'
    ]
    
    const searchTerm = `%${q}%`
    let params: any[] = [searchTerm, searchTerm, searchTerm]
    
    if (type && type !== 'all') {
      conditions.push('s.type = ?')
      params.push(type)
    } else {
      conditions.push('s.type IN ("manga", "webtoon")')
    }
    
    if (status) {
      conditions.push('s.status = ?')
      params.push(status)
    }
    
    // Add limit and offset
    params.push(parseInt(limit), offset)
    
    const query = `
      SELECT s.*, st.name as studio_name 
      FROM series s
      LEFT JOIN studios st ON s.studio_id = st.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY s.view_count DESC
      LIMIT ? OFFSET ?
    `
    
    const result = await c.env.DB.prepare(query).bind(...params).all()
    
    // Transform results
    const transformedResults = (result.results || []).map(series => transformSeries(series, baseUrl))
    
    return c.json(transformedResults)
  } catch (error) {
    console.error('Mobile search error:', error)
    return c.json({ error: 'Search failed' }, 500)
  }
})

// Track view count (no auth required for basic tracking)
mobile.post('/chapters/:id/view', async (c) => {
  const chapterId = c.req.param('id')
  
  try {
    await c.env.DB.prepare(`
      UPDATE episodes 
      SET view_count = view_count + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(chapterId).run()
    
    // Also update series view count
    await c.env.DB.prepare(`
      UPDATE series 
      SET view_count = view_count + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = (SELECT series_id FROM episodes WHERE id = ?)
    `).bind(chapterId).run()
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Track view error:', error)
    return c.json({ error: 'Failed to track view' }, 500)
  }
})

// Get trending/popular series
mobile.get('/trending', async (c) => {
  const { type, period = 'week', limit = '10' } = c.req.query()
  const baseUrl = `https://${c.req.header('host') || 'studio-dashboard-api.black-poetry-4fa5.workers.dev'}`
  
  try {
    // Calculate date for period
    let dateFilter = "datetime('now', '-7 days')"; // week
    if (period === 'day') dateFilter = "datetime('now', '-1 day')";
    if (period === 'month') dateFilter = "datetime('now', '-30 days')";
    
    let query;
    let params: any[] = [];
    
    if (type && type !== 'all') {
      query = `
        SELECT s.*, st.name as studio_name,
               COUNT(DISTINCT e.id) as recent_chapters,
               SUM(e.view_count) as recent_views
        FROM series s
        LEFT JOIN studios st ON s.studio_id = st.id
        LEFT JOIN episodes e ON s.id = e.series_id 
          AND e.published_at > ${dateFilter}
        WHERE s.status = 'published' 
          AND s.type = ?
          AND s.deleted_at IS NULL
        GROUP BY s.id
        ORDER BY recent_views DESC, s.view_count DESC
        LIMIT ?
      `;
      params = [type, parseInt(limit)];
    } else {
      query = `
        SELECT s.*, st.name as studio_name,
               COUNT(DISTINCT e.id) as recent_chapters,
               SUM(e.view_count) as recent_views
        FROM series s
        LEFT JOIN studios st ON s.studio_id = st.id
        LEFT JOIN episodes e ON s.id = e.series_id 
          AND e.published_at > ${dateFilter}
        WHERE s.status = 'published'
          AND s.type IN ('manga', 'webtoon')
          AND s.deleted_at IS NULL
        GROUP BY s.id
        ORDER BY recent_views DESC, s.view_count DESC
        LIMIT ?
      `;
      params = [parseInt(limit)];
    }
    
    const result = await c.env.DB.prepare(query).bind(...params).all()
    
    // Transform results
    const transformedResults = (result.results || []).map(series => transformSeries(series, baseUrl))
    
    return c.json(transformedResults)
  } catch (error) {
    console.error('Mobile trending error:', error)
    return c.json({ error: 'Failed to fetch trending' }, 500)
  }
})

export default mobile