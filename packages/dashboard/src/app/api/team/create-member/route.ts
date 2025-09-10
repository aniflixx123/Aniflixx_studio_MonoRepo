// packages/dashboard/src/app/api/team/create-member/route.ts
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
      `${process.env.NEXT_PUBLIC_API_URL}/api/team/create-member`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Org-Id': orgId,
        },
        body: JSON.stringify(body)
      }
    )

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Create member error:', error)
    return NextResponse.json({ error: 'Failed to create member' }, { status: 500 })
  }
}