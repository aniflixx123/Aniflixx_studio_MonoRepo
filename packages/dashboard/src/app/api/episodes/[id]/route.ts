import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

// GET single episode
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/episodes/${id}`
    )
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch episode' }, { status: 500 })
  }
}

// UPDATE episode
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
      `${process.env.NEXT_PUBLIC_API_URL}/api/episodes/${id}`,
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
    return NextResponse.json({ error: 'Failed to update episode' }, { status: 500 })
  }
}

// DELETE episode
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
      `${process.env.NEXT_PUBLIC_API_URL}/api/episodes/${id}`,
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
    return NextResponse.json({ error: 'Failed to delete episode' }, { status: 500 })
  }
}