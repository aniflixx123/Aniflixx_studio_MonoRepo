import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

// GET regions
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/series/${id}/regions`
    )
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch regions' }, { status: 500 })
  }
}

// SET regions
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/series/${id}/regions`,
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
    return NextResponse.json({ error: 'Failed to set regions' }, { status: 500 })
  }
}