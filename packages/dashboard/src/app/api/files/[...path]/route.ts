import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await context.params
    const filePath = path.join('/')
    
    // Forward to Cloudflare Workers API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/files/${filePath}`,
      {
        method: 'GET',
        headers: {
          'Cache-Control': 'public, max-age=3600',
        }
      }
    )
    
    if (!response.ok) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Get the file data
    const data = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    
    // Return the file with appropriate headers
    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      }
    })
  } catch (error) {
    console.error('Error fetching file:', error)
    return NextResponse.json({ error: 'Failed to fetch file' }, { status: 500 })
  }
}