import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the form data from the request
    const formData = await request.formData()
    
    // Forward to Cloudflare Workers API
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload-chapter`, {
      method: 'POST',
      headers: {
        'X-Org-Id': orgId,
      },
      body: formData, // Forward the entire FormData
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(error, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Chapter upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

// Increase body size limit for multiple images
export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds timeout for large uploads