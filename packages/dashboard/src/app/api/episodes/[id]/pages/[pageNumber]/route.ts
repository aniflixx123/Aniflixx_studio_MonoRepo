import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; pageNumber: string }> }
) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, pageNumber } = await context.params
    const formData = await request.formData()

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/episodes/${id}/pages/${pageNumber}`,
      {
        method: 'PUT',
        headers: {
          'X-Org-Id': orgId,
        },
        body: formData
      }
    )
    
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to replace page' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; pageNumber: string }> }
) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, pageNumber } = await context.params

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/episodes/${id}/pages/${pageNumber}`,
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
    return NextResponse.json({ error: 'Failed to delete page' }, { status: 500 })
  }
}