// packages/dashboard/src/app/api/upload-chapter/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the form data
    const formData = await request.formData()
    
    // Forward the request to your Cloudflare Worker API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/upload/chapter`,
      {
        method: 'POST',
        headers: {
          'X-Org-Id': orgId,
        },
        body: formData, // Pass FormData directly
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Upload failed:', error)
      return NextResponse.json(
        { error: 'Upload failed' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Upload chapter error:', error)
    return NextResponse.json(
      { error: 'Failed to upload chapter' },
      { status: 500 }
    )
  }
}