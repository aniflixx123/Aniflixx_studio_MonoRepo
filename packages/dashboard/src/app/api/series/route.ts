import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { userId, orgId } = await auth()
    
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body:any = await request.json()
    console.log('Received body:', body) // Debug log

    // Handle both old format (camelCase) and new format (snake_case)
    const requestData = {
      title: body.title,
      title_english: body.title_english || body.titleEnglish || null,
      title_japanese: body.title_japanese || body.titleJapanese || null,
      type: body.type,
      description: body.description || null,
      // Handle genres and tags - they might come as arrays or strings
      genres: Array.isArray(body.genres) 
        ? body.genres 
        : body.genres 
          ? body.genres.split(',').map((g: string) => g.trim()) 
          : [],
      tags: Array.isArray(body.tags)
        ? body.tags
        : body.tags
          ? body.tags.split(',').map((t: string) => t.trim())
          : [],
      // New fields from the enhanced create page
      status: body.status || 'draft',
      release_schedule: body.release_schedule || null,
      release_day: body.release_day || null,
      release_time: body.release_time || null,
      release_timezone: body.release_timezone || null,
      is_premium: body.is_premium || false,
      is_featured: body.is_featured || false,
      is_exclusive: body.is_exclusive || false,
      content_rating: body.content_rating || null,
      target_audience: body.target_audience || null,
      monetization_type: body.monetization_type || 'free',
      early_access_hours: body.early_access_hours || 0
    }

    console.log('Sending to API:', requestData) // Debug log

    // Call your Cloudflare Workers API
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/series`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Org-Id': orgId
      },
      body: JSON.stringify(requestData)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('API error response:', errorText)
      throw new Error(`Failed to create series: ${errorText}`)
    }

    const data = await response.json()
    console.log('Series created:', data) // Debug log
    
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Error creating series:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create series' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { userId, orgId } = await auth()
    
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check for query params (e.g., includeArchived)
    const url = new URL(request.url)
    const includeArchived = url.searchParams.get('includeArchived') === 'true'

    // Fetch series from your Cloudflare Workers API
    const apiUrl = includeArchived 
      ? `${process.env.NEXT_PUBLIC_API_URL}/api/series?orgId=${orgId}&includeArchived=true`
      : `${process.env.NEXT_PUBLIC_API_URL}/api/series?orgId=${orgId}`
      
    const response = await fetch(apiUrl, {
      headers: {
        'X-Org-Id': orgId
      }
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch series')
    }

    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Error fetching series:', error)
    return NextResponse.json(
      { error: 'Failed to fetch series' },
      { status: 500 }
    )
  }
}