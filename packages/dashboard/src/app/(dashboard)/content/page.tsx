// packages/dashboard/src/app/(dashboard)/content/page.tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

type Series = {
  id: string
  title: string
  title_english?: string
  type: 'anime' | 'manga' | 'webtoon' | 'light_novel'
  status: string
  genres?: string
  tags?: string
  is_premium: boolean
  is_featured: boolean
  view_count: number
  created_at: string
  updated_at: string
  published_at?: string
}

async function getSeries(orgId: string): Promise<Series[]> {
  try {
    // Use internal API route if available, otherwise use environment variable
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'
    
    console.log('Fetching from:', `${apiUrl}/api/series`)
    
    const response = await fetch(
      `${apiUrl}/api/series`,
      {
        headers: {
          'X-Org-Id': orgId,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      }
    )
    
    console.log('Response status:', response.status)
    
    if (!response.ok) {
      console.error('API response not ok:', response.status, response.statusText)
      return []
    }
    
    const data = await response.json()
    console.log('Fetched series:', data)
    
    // Ensure we return an array
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Error fetching series:', error)
    return []
  }
}

function getTypeIcon(type: string) {
  switch(type) {
    case 'anime':
      return '🎬'
    case 'manga':
      return '📖'
    case 'webtoon':
      return '📱'
    case 'light_novel':
      return '📚'
    default:
      return '📺'
  }
}

function getStatusBadge(status: string) {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    published: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    hiatus: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-red-100 text-red-800',
    archived: 'bg-gray-100 text-gray-500'
  }
  
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status] || colors.draft}`}>
      {status}
    </span>
  )
}

export default async function ContentPage() {
  const { userId, orgId } = await auth()
  
  if (!userId || !orgId) {
    redirect('/sign-in')
  }
  
  const series = await getSeries(orgId)
  
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Content Library</h1>
          <p className="text-gray-600 mt-2">Manage all your series, episodes, and chapters</p>
        </div>
        
        <Link
          href="/content/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New Series
        </Link>
      </div>

      {series.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">No content yet</h2>
          <p className="text-gray-500 mb-6">
            Start by creating your first series to upload episodes or chapters
          </p>
          <Link
            href="/content/new"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Your First Series
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {series.map((item) => {
            // Parse genres and tags if they're strings
            let genres: string[] = []
            let tags: string[] = []
            
            if (typeof item.genres === 'string') {
              try {
                genres = JSON.parse(item.genres)
              } catch {
                genres = []
              }
            } else if (Array.isArray(item.genres)) {
              genres = item.genres
            }
            
            if (typeof item.tags === 'string') {
              try {
                tags = JSON.parse(item.tags)
              } catch {
                tags = []
              }
            } else if (Array.isArray(item.tags)) {
              tags = item.tags
            }
            
            return (
              <Link
                key={item.id}
                href={`/content/${item.id}`}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getTypeIcon(item.type)}</span>
                    <div>
                      <h3 className="font-semibold text-lg">{item.title}</h3>
                      {item.title_english && item.title_english !== item.title && (
                        <p className="text-sm text-gray-600">{item.title_english}</p>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(item.status)}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="capitalize">{item.type.replace('_', ' ')}</span>
                    {item.is_premium && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">
                        Premium
                      </span>
                    )}
                    {item.is_featured && (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">
                        Featured
                      </span>
                    )}
                  </div>
                  
                  {genres.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {genres.slice(0, 3).map((genre, index) => (
                        <span key={index} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                          {genre}
                        </span>
                      ))}
                      {genres.length > 3 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                          +{genres.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm text-gray-500">
                      {item.view_count || 0} views
                    </span>
                    <span className="text-xs text-gray-400">
                      Updated {new Date(item.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}