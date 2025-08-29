// packages/dashboard/src/app/api/team/members/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get studio ID from your database or use the org ID
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/team/studio/${orgId}/members`,
      {
        headers: {
          'X-Org-Id': orgId,
        }
      }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch team members')
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Team members error:', error)
    return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 })
  }
}