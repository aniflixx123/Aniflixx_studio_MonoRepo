// packages/api/src/routes/team.ts
import { Hono } from 'hono'
import { Bindings } from '../types'

const team = new Hono<{ Bindings: Bindings }>()

// Get team members for a studio
team.get('/studio/:studioId/members', async (c) => {
  const studioId = c.req.param('studioId')
  const orgId = c.req.header('X-Org-Id')
  
  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  try {
    // Verify studio ownership
    const studio = await c.env.DB.prepare(
      'SELECT id FROM studios WHERE id = ? AND clerk_org_id = ?'
    ).bind(studioId, orgId).first()

    if (!studio) {
      return c.json({ error: 'Studio not found or unauthorized' }, 404)
    }

    const members = await c.env.DB.prepare(`
      SELECT 
        tm.*,
        COUNT(DISTINCT s.id) as series_count,
        COUNT(DISTINCT e.id) as episodes_uploaded
      FROM team_members tm
      LEFT JOIN series s ON s.studio_id = tm.studio_id AND JSON_EXTRACT(s.metadata, '$.uploaded_by') = tm.user_id
      LEFT JOIN episodes e ON e.series_id = s.id AND JSON_EXTRACT(e.metadata, '$.uploaded_by') = tm.user_id
      WHERE tm.studio_id = ? AND tm.deleted_at IS NULL
      GROUP BY tm.id
      ORDER BY tm.created_at DESC
    `).bind(studioId).all()

    return c.json(members.results || [])
  } catch (error) {
    console.error('Get team members error:', error)
    return c.json({ error: 'Failed to fetch team members' }, 500)
  }
})

// Invite team member
team.post('/studio/:studioId/invite', async (c) => {
  const studioId = c.req.param('studioId')
  const orgId = c.req.header('X-Org-Id')
  const body = await c.req.json()
  const { email, role, permissions } = body

  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  try {
    // Verify studio ownership
    const studio = await c.env.DB.prepare(
      'SELECT id FROM studios WHERE id = ? AND clerk_org_id = ?'
    ).bind(studioId, orgId).first()

    if (!studio) {
      return c.json({ error: 'Studio not found or unauthorized' }, 404)
    }

    // Check if already invited or member
    const existing = await c.env.DB.prepare(`
      SELECT 1 FROM team_invitations 
      WHERE studio_id = ? AND email = ? AND status = 'pending'
      UNION
      SELECT 1 FROM team_members 
      WHERE studio_id = ? AND email = ? AND deleted_at IS NULL
    `).bind(studioId, email, studioId, email).first()

    if (existing) {
      return c.json({ error: 'User already invited or is a member' }, 400)
    }

    // Create invitation
    const inviteToken = crypto.randomUUID()
    const invitation = await c.env.DB.prepare(`
      INSERT INTO team_invitations (
        id, studio_id, email, role, permissions, 
        invite_token, status, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now', '+7 days'), CURRENT_TIMESTAMP)
      RETURNING *
    `).bind(
      crypto.randomUUID(),
      studioId,
      email,
      role,
      JSON.stringify(permissions || {}),
      inviteToken
    ).first()

    // TODO: Send invitation email

    return c.json({ success: true, invitation })
  } catch (error) {
    console.error('Invite member error:', error)
    return c.json({ error: 'Failed to invite member' }, 500)
  }
})

// Update member role/permissions
team.put('/members/:memberId', async (c) => {
  const memberId = c.req.param('memberId')
  const orgId = c.req.header('X-Org-Id')
  const body = await c.req.json()
  const { role, permissions } = body

  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  try {
    // Verify ownership
    const member:any = await c.env.DB.prepare(`
      SELECT tm.* FROM team_members tm
      JOIN studios s ON tm.studio_id = s.id
      WHERE tm.id = ? AND s.clerk_org_id = ?
    `).bind(memberId, orgId).first()

    if (!member) {
      return c.json({ error: 'Member not found or unauthorized' }, 404)
    }

    // Update member
    const updated = await c.env.DB.prepare(`
      UPDATE team_members 
      SET role = ?, permissions = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `).bind(
      role || member.role,
      JSON.stringify(permissions || JSON.parse(member.permissions)),
      memberId
    ).first()

    return c.json(updated)
  } catch (error) {
    console.error('Update member error:', error)
    return c.json({ error: 'Failed to update member' }, 500)
  }
})

// Remove team member
team.delete('/members/:memberId', async (c) => {
  const memberId = c.req.param('memberId')
  const orgId = c.req.header('X-Org-Id')

  if (!orgId) {
    return c.json({ error: 'Organization ID required' }, 401)
  }

  try {
    // Soft delete
    await c.env.DB.prepare(`
      UPDATE team_members 
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = ? AND studio_id IN (
        SELECT id FROM studios WHERE clerk_org_id = ?
      )
    `).bind(memberId, orgId).run()

    return c.json({ success: true })
  } catch (error) {
    console.error('Remove member error:', error)
    return c.json({ error: 'Failed to remove member' }, 500)
  }
})

export default team