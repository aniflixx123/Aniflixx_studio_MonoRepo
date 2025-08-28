import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

// GET single series
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/series/${id}?orgId=${orgId}`,
      {
        headers: {
          'X-Org-Id': orgId,
        }
      }
    )
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Series not found' }, { status: 404 })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching series:', error)
    return NextResponse.json({ error: 'Failed to fetch series' }, { status: 500 })
  }
}

// UPDATE series
export async function PUT(
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
      `${process.env.NEXT_PUBLIC_API_URL}/api/series/${id}`,
      {
        method: 'PUT',
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
    console.error('Error updating series:', error)
    return NextResponse.json({ error: 'Failed to update series' }, { status: 500 })
  }
}

// DELETE series
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/series/${id}`,
      {
        method: 'DELETE',
        headers: {
          'X-Org-Id': orgId,
        }
      }
    )
    
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error deleting series:', error)
    return NextResponse.json({ error: 'Failed to delete series' }, { status: 500 })
  }
}