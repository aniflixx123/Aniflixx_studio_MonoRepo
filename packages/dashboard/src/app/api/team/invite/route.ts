// packages/dashboard/src/app/api/team/invite/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/team/studio/${orgId}/invite`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Org-Id': orgId,
        },
        body: JSON.stringify(body)
      }
    )

    if (!response.ok) {
      throw new Error('Failed to invite member')
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Invite error:', error)
    return NextResponse.json({ error: 'Failed to invite member' }, { status: 500 })
  }
}