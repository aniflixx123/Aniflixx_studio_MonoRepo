import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ chapterId: string }> }
) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { chapterId } = await context.params
    const formData = await request.formData()

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/upload/chapter/${chapterId}/pages`,
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
    return NextResponse.json({ error: 'Failed to add pages' }, { status: 500 })
  }
}