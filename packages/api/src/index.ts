import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { Bindings } from './types'

// Import routes
import studioRoutes from './routes/studio'
import seriesRoutes from './routes/series'
import episodeRoutes from './routes/episodes'
import uploadRoutes from './routes/upload'
import regionRoutes from './routes/regions'
import monetizationRoutes from './routes/monetization'
import analyticsRoutes from './routes/analytics'
import scheduleRoutes from './routes/schedule'
import readingRoutes from './routes/reading'

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for dashboard
app.use('/*', cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'https://studio.aniflixx.com'],
  credentials: true,
}))

// Health check
app.get('/api/health', (c) => {
  return c.json({ 
    status: 'ok', 
    message: 'Studio API is running',
    timestamp: new Date().toISOString()
  })
})

// Mount routes
app.route('/api/studio', studioRoutes)
app.route('/api/series', seriesRoutes)
app.route('/api/episodes', episodeRoutes)
app.route('/api/upload', uploadRoutes)
app.route('/api/regions', regionRoutes)
app.route('/api/monetization', monetizationRoutes)
app.route('/api/analytics', analyticsRoutes)
app.route('/api/schedule', scheduleRoutes)
app.route('/api/reading', readingRoutes)

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Endpoint not found' }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error('API Error:', err)
  return c.json({ 
    error: 'Internal server error',
    message: err instanceof Error ? err.message : 'Unknown error'
  }, 500)
})

export default app