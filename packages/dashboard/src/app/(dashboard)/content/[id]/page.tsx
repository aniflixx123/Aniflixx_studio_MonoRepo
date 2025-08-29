// packages/dashboard/src/app/(dashboard)/content/[id]/page.tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SeriesActions from '@/components/SeriesActions'
import EpisodeCard from '@/components/EpisodeCard'

type Series = {
  id: string
  title: string
  title_english?: string
  title_japanese?: string
  type: 'anime' | 'manga' | 'webtoon' | 'light_novel'
  status: string
  description?: string
  genres?: string
  tags?: string
  content_rating?: string
  target_audience?: string
  is_premium: boolean
  is_featured: boolean
  is_exclusive: boolean
  release_schedule?: string
  release_day?: string
  release_time?: string
  release_timezone?: string
  total_episodes?: number
  aired_episodes?: number
  episode_duration?: number
  view_count: number
  like_count: number
  rating_average?: number
  created_at: string
  updated_at: string
  published_at?: string
}

type Episode = {
  id: string
  series_id: string
  episode_number: number
  title: string
  description?: string
  video_path: string
  page_count?: number
  video_quality?: string
  file_size?: number
  duration?: number
  thumbnail?: string
  status: string
  is_premium: boolean
  is_early_access: boolean
  is_free_preview: boolean
  view_count: number
  completion_rate?: number
  average_watch_time?: number
  scheduled_at?: string
  published_at?: string
  available_until?: string
  created_at: string
  updated_at: string
}

async function getSeriesDetails(id: string, orgId: string): Promise<Series | null> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/series/${id}`,
      {
        headers: {
          'X-Org-Id': orgId
        },
        cache: 'no-store'
      }
    )
    
    if (!response.ok) return null
    
    const data:any = await response.json()
    
    // Parse JSON fields if they're strings
    if (typeof data.genres === 'string') {
      try {
        data.genres = JSON.parse(data.genres)
      } catch {
        data.genres = []
      }
    }
    
    if (typeof data.tags === 'string') {
      try {
        data.tags = JSON.parse(data.tags)
      } catch {
        data.tags = []
      }
    }
    
    return data
  } catch (error) {
    console.error('Error fetching series:', error)
    return null
  }
}

async function getEpisodes(seriesId: string): Promise<Episode[]> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/series/${seriesId}/episodes`,
      { cache: 'no-store' }
    )
    
    if (!response.ok) return []
    
    const data = await response.json()
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Error fetching episodes:', error)
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

export default async function SeriesDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { userId, orgId } = await auth()
  
  if (!userId || !orgId) {
    redirect('/sign-in')
  }
  
  const { id } = await params
  const series = await getSeriesDetails(id, orgId)
  
  if (!series) {
    redirect('/content')
  }

  const episodes = await getEpisodes(id)
  
  // Calculate stats
  const publishedEpisodes = episodes.filter(ep => ep.status === 'published').length
  const scheduledEpisodes = episodes.filter(ep => ep.status === 'scheduled').length
  const totalViews = episodes.reduce((sum, ep) => sum + (ep.view_count || 0), 0)
  
  // Parse genres and tags if they're strings
  const genres = Array.isArray(series.genres) ? series.genres : []
  const tags = Array.isArray(series.tags) ? series.tags : []
  
  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Back Navigation */}
      <div className="mb-6">
        <Link href="/content" className="text-blue-600 hover:underline flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Content
        </Link>
      </div>
      
      {/* Series Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{getTypeIcon(series.type)}</span>
              <div>
                <h1 className="text-3xl font-bold">{series.title}</h1>
                {series.title_english && series.title_english !== series.title && (
                  <p className="text-gray-600">{series.title_english}</p>
                )}
                {series.title_japanese && (
                  <p className="text-gray-500 text-sm">{series.title_japanese}</p>
                )}
              </div>
            </div>
            
            {/* Status Badges */}
            <div className="flex gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                series.status === 'published' ? 'bg-green-100 text-green-800' :
                series.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                series.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                series.status === 'hiatus' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {series.status}
              </span>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                {series.type.replace('_', ' ')}
              </span>
              {series.is_premium && (
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                  Premium
                </span>
              )}
              {series.is_featured && (
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                  Featured
                </span>
              )}
              {series.is_exclusive && (
                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                  Exclusive
                </span>
              )}
            </div>
            
            {/* Description */}
            {series.description && (
              <p className="text-gray-700 mb-4">{series.description}</p>
            )}
            
            {/* Genres */}
            {genres.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-4">
                {genres.map((genre: string, index: number) => (
                  <span key={index} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    {genre}
                  </span>
                ))}
              </div>
            )}
            
            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-4">
                {tags.map((tag: string, index: number) => (
                  <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            
            {/* Release Schedule */}
            {series.release_schedule && series.release_schedule !== 'completed' && (
              <div className="text-sm text-gray-600 mb-4">
                <span className="font-medium">Release Schedule:</span> {' '}
                <span className="capitalize">{series.release_schedule}</span>
                {series.release_day && ` on ${series.release_day}s`}
                {series.release_time && ` at ${series.release_time}`}
                {series.release_timezone && ` (${series.release_timezone})`}
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <SeriesActions series={series} />
        </div>
        
        {/* Stats Bar */}
        <div className="grid grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-600">Total {series.type === 'anime' ? 'Episodes' : 'Chapters'}</p>
            <p className="text-2xl font-bold">{episodes.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Published</p>
            <p className="text-2xl font-bold text-green-600">{publishedEpisodes}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Scheduled</p>
            <p className="text-2xl font-bold text-yellow-600">{scheduledEpisodes}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Views</p>
            <p className="text-2xl font-bold">{totalViews.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Avg Rating</p>
            <p className="text-2xl font-bold">
              {series.rating_average ? series.rating_average.toFixed(1) : '—'}
            </p>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="border-t mt-6 pt-4">
          <div className="flex gap-6">
            <button className="font-medium text-blue-600 border-b-2 border-blue-600 pb-2">
              {series.type === 'anime' ? 'Episodes' : 'Chapters'}
            </button>
            <Link 
              href={`/content/${id}/regional`}
              className="font-medium text-gray-600 hover:text-gray-800 pb-2 transition-colors"
            >
              Regional Settings
            </Link>
            <Link 
              href={`/content/${id}/schedule`}
              className="font-medium text-gray-600 hover:text-gray-800 pb-2 transition-colors"
            >
              Schedule
            </Link>
            <Link 
              href={`/content/${id}/monetization`}
              className="font-medium text-gray-600 hover:text-gray-800 pb-2 transition-colors"
            >
              Monetization
            </Link>
            <Link 
              href={`/content/${id}/analytics`}
              className="font-medium text-gray-600 hover:text-gray-800 pb-2 transition-colors"
            >
              Analytics
            </Link>
          </div>
        </div>
      </div>

      {/* Episodes Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold">
              {series.type === 'anime' ? 'Episodes' : series.type === 'manga' || series.type === 'webtoon' ? 'Chapters' : 'Volumes'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage your {series.type === 'anime' ? 'episodes' : 'chapters'} here
            </p>
          </div>
          
          <div className="flex gap-2">
            <Link
              href={`/content/${id}/upload`}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Upload {series.type === 'anime' ? 'Episode' : 'Chapter'}
            </Link>
            
            <button className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 transition-colors">
              Bulk Actions
            </button>
          </div>
        </div>
        
        {/* Episodes List */}
        {episodes.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">
              {series.type === 'anime' ? '🎬' : '📚'}
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No {series.type === 'anime' ? 'episodes' : 'chapters'} yet
            </h3>
            <p className="text-gray-500 mb-6">
              Upload your first {series.type === 'anime' ? 'episode' : 'chapter'} to get started
            </p>
            <Link
              href={`/content/${id}/upload`}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload First {series.type === 'anime' ? 'Episode' : 'Chapter'}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {episodes
              .sort((a, b) => a.episode_number - b.episode_number)
              .map((episode) => (
                <EpisodeCard 
                  key={episode.id} 
                  episode={episode} 
                  seriesType={series.type}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  )
}