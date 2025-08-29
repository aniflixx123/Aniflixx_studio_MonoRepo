import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

// UPDATE single image
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string, type: string }> }
) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, type } = await context.params
    const formData = await request.formData()

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/upload/series/${id}/image/${type}`,
      {
        method: 'PUT',
        headers: {
          'X-Org-Id': orgId,
        },
        body: formData,
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Image update error:', error)
      return NextResponse.json({ error: 'Update failed' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Image update error:', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}

// DELETE single image
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string, type: string }> }
) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, type } = await context.params

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/upload/series/${id}/image/${type}`,
      {
        method: 'DELETE',
        headers: {
          'X-Org-Id': orgId,
        }
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Image delete error:', error)
      return NextResponse.json({ error: 'Delete failed' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Image delete error:', error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}