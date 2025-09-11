import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Forward the entire FormData to the backend
    const formData = await request.formData()
    
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/upload/chapter`,
      {
        method: 'POST',
        headers: {
          'X-Org-Id': orgId,
        },
        body: formData
      }
    )
    
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Chapter upload error:', error)
    return NextResponse.json({ error: 'Failed to upload chapter' }, { status: 500 })
  }
}