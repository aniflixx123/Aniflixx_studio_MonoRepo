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

    if (!response.ok) {
      const error = await response.text()
      console.error('Upload error:', error)
      return NextResponse.json({ error: 'Upload failed' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Series image upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}