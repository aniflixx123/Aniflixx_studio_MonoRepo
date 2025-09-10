// packages/dashboard/src/app/api/team/members/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/team/members`,
      {
        headers: {
          'X-Org-Id': orgId,
        }
      }
    )

    if (!response.ok) {
      console.error('Backend error:', response.status)
      return NextResponse.json([])
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Team API error:', error)
    return NextResponse.json([])
  }
}