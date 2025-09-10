// packages/api/src/routes/team.ts
import { Hono } from 'hono'
import { Bindings } from '../types'

const team = new Hono<{ Bindings: Bindings }>()

// Sync Clerk organization members with database
team.post('/sync', async (c) => {
 const orgId = c.req.header('X-Org-Id')
 const { members } = await c.req.json()
 
 if (!orgId) {
   return c.json({ error: 'Unauthorized' }, 401)
 }

 try {
   // Get or create studio
   let studio = await c.env.DB.prepare(
     'SELECT id FROM studios WHERE clerk_org_id = ?'
   ).bind(orgId).first()

   if (!studio) {
     // Create studio if it doesn't exist
     const studioId = crypto.randomUUID()
     await c.env.DB.prepare(`
       INSERT INTO studios (id, clerk_org_id, name, created_at, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     `).bind(studioId, orgId, 'My Studio').run()
     
     studio = { id: studioId }
   }

   // Sync each member from Clerk
   for (const member of members) {
     const existing = await c.env.DB.prepare(`
       SELECT id FROM team_members 
       WHERE studio_id = ? AND user_id = ?
     `).bind(studio.id, member.userId).first()

     if (!existing) {
       await c.env.DB.prepare(`
         INSERT INTO team_members (
           id, studio_id, user_id, email, name, role, 
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       `).bind(
         crypto.randomUUID(),
         studio.id,
         member.userId,
         member.email,
         member.name || null,
         member.role === 'org:admin' ? 'admin' : 'member'
       ).run()
     } else {
       // Update existing member
       await c.env.DB.prepare(`
         UPDATE team_members 
         SET role = ?, name = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
       `).bind(
         member.role === 'org:admin' ? 'admin' : 'member',
         member.name || null,
         existing.id
       ).run()
     }
   }

   return c.json({ success: true })
 } catch (error) {
   console.error('Sync error:', error)
   return c.json({ error: 'Failed to sync members' }, 500)
 }
})

// Get team members with contribution stats
team.get('/members', async (c) => {
 const orgId = c.req.header('X-Org-Id')
 
 if (!orgId) {
   return c.json({ error: 'Unauthorized' }, 401)
 }

 try {
   const studio = await c.env.DB.prepare(
     'SELECT id FROM studios WHERE clerk_org_id = ?'
   ).bind(orgId).first()

   if (!studio) {
     return c.json([])
   }

   const members = await c.env.DB.prepare(`
     SELECT 
       tm.*,
       COUNT(DISTINCT s.id) as series_count,
       COUNT(DISTINCT e.id) as episodes_uploaded
     FROM team_members tm
     LEFT JOIN series s ON s.studio_id = tm.studio_id
     LEFT JOIN episodes e ON e.series_id = s.id
     WHERE tm.studio_id = ? AND tm.deleted_at IS NULL
     GROUP BY tm.id
     ORDER BY tm.created_at DESC
   `).bind(studio.id).all()

   return c.json(members.results || [])
 } catch (error) {
   console.error('Get members error:', error)
   return c.json({ error: 'Failed to fetch members' }, 500)
 }
})

// Remove team member (soft delete)
team.delete('/members/:id', async (c) => {
 const memberId = c.req.param('id')
 const orgId = c.req.header('X-Org-Id')

 if (!orgId || !memberId) {
   return c.json({ error: 'Invalid request' }, 400)
 }

 try {
   const studio = await c.env.DB.prepare(
     'SELECT id FROM studios WHERE clerk_org_id = ?'
   ).bind(orgId).first()

   if (!studio) {
     return c.json({ error: 'Studio not found' }, 404)
   }

   await c.env.DB.prepare(`
     UPDATE team_members 
     SET deleted_at = CURRENT_TIMESTAMP
     WHERE id = ? AND studio_id = ?
   `).bind(memberId, studio.id).run()

   return c.json({ success: true })
 } catch (error) {
   console.error('Remove member error:', error)
   return c.json({ error: 'Failed to remove member' }, 500)
 }
})

// Update member role or permissions
team.put('/members/:id', async (c) => {
 const memberId = c.req.param('id')
 const orgId = c.req.header('X-Org-Id')
 const { role, permissions } = await c.req.json()

 if (!orgId || !memberId) {
   return c.json({ error: 'Invalid request' }, 400)
 }

 try {
   const studio = await c.env.DB.prepare(
     'SELECT id FROM studios WHERE clerk_org_id = ?'
   ).bind(orgId).first()

   if (!studio) {
     return c.json({ error: 'Studio not found' }, 404)
   }

   await c.env.DB.prepare(`
     UPDATE team_members 
     SET 
       role = COALESCE(?, role),
       permissions = COALESCE(?, permissions),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND studio_id = ?
   `).bind(
     role || null,
     permissions ? JSON.stringify(permissions) : null,
     memberId,
     studio.id
   ).run()

   return c.json({ success: true })
 } catch (error) {
   console.error('Update member error:', error)
   return c.json({ error: 'Failed to update member' }, 500)
 }
})

export default team