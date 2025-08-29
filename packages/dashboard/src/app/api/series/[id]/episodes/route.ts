import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    // The backend route is at /api/series/:id/episodes
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/series/${id}/episodes`,
      { 
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch episodes' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching episodes:', error)
    return NextResponse.json({ error: 'Failed to fetch episodes' }, { status: 500 })
  }
}