// packages/api/src/index.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { Bindings } from './types'

// Import routes - make sure all these files exist
import studioRoutes from './routes/studio'
import seriesRoutes from './routes/series'
import episodeRoutes from './routes/episodes'
import uploadRoutes from './routes/upload'
import regionRoutes from './routes/regions'
import monetizationRoutes from './routes/monetization'
import analyticsRoutes from './routes/analytics'
import scheduleRoutes from './routes/schedule'
import readingRoutes from './routes/reading'
import mobile from './routes/mobile' // Public routes for mobile app
import teamRoutes from './routes/team'

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for dashboard
app.use('/*', cors({
  origin: [
      'https://aniflixx.com',
  'https://www.aniflixx.com',
  'http://localhost:3000'
  ],
  credentials: true,
  allowHeaders: ['Content-Type', 'X-Org-Id', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}))

// Health check
app.get('/api/health', (c) => {
  return c.json({ 
    status: 'ok', 
    message: 'Studio API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
})

// Mount routes - ORDER MATTERS!
app.route('/api/studio', studioRoutes)
app.route('/api/series', seriesRoutes)
app.route('/api/episodes', episodeRoutes)
app.route('/api/upload', uploadRoutes)
app.route('/api/monetization', monetizationRoutes)
app.route('/api/analytics', analyticsRoutes)
app.route('/api/reading', readingRoutes)
app.route('/api/mobile', mobile)// Public routes for mobile app
app.route('/api/team', teamRoutes)

// These need special handling for nested routes
app.route('/api', regionRoutes) // Handles /api/episodes/:id/regions and /api/series/:id/regions
app.route('/api', scheduleRoutes) // Handles /api/episodes/:id/schedule

// Legacy upload-chapter route (for backward compatibility)
app.post('/api/upload-chapter', async (c:any) => {
  // Forward to new upload route
  return uploadRoutes.request('/chapter', c)
})

// Serve files from R2
app.get('/api/files/*', async (c) => {
  const key = c.req.path.replace('/api/files/', '')
  
  try {
    const object = await c.env.CONTENT.get(key)
    
    if (!object) {
      return c.json({ error: 'File not found' }, 404)
    }
    
    const headers:any = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('etag', object.httpEtag)
    headers.set('cache-control', 'public, max-age=3600')
    
    return new Response(object.body, { headers })
  } catch (error) {
    console.error('File retrieval error:', error)
    return c.json({ error: 'Failed to retrieve file' }, 500)
  }
})

// 404 handler
app.notFound((c) => {
  return c.json({ 
    error: 'Endpoint not found',
    path: c.req.path,
    method: c.req.method
  }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error('API Error:', err)
  
  // Check for specific error types
  if (err instanceof SyntaxError) {
    return c.json({ error: 'Invalid JSON' }, 400)
  }
  
  return c.json({ 
    error: 'Internal server error',
    message: err instanceof Error ? err.message : 'Unknown error',
    path: c.req.path
  }, 500)
})

export default app