import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

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
    const formData = await request.formData()

    // Forward to Cloudflare Workers API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/upload/series/${id}/images`,
      {
        method: 'POST',
        headers: {
          'X-Org-Id': orgId,
        },
        body: formData,
      }
    )

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Series image upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}