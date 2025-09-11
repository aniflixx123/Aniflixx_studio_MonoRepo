// app/(dashboard)/upload/page.tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import UploadCenter from '@/components/upload-center'
import { fetchAPI } from '@/lib/api'

type Series = {
  id: string
  title: string
  title_english?: string
  type: 'anime' | 'manga' | 'webtoon' | 'light_novel'
  status: string
  episodes_count?: number
  chapters_count?: number
  // Add fields to match what the API actually returns
  total_episodes?: number
  total_chapters?: number
  view_count?: number
  created_at?: string
  updated_at?: string
}

type Episode = {
  id: string
  series_id: string
  episode_number: number
  title: string
  video_url?: string
  video_path?: string
  thumbnail_url?: string
  thumbnail?: string
  page_count?: number
  status?: string
  created_at: string
}

async function getSeries(orgId: string): Promise<Series[]> {
  try {
    const response = await fetchAPI('/api/series', {
      headers: {
        'X-Org-Id': orgId
      }
    })
    
    // The API returns an array of series
    if (Array.isArray(response)) {
      return response
    }
    
    return []
  } catch (error) {
    console.error('Error fetching series:', error)
    return []
  }
}

async function getSeriesEpisodes(seriesId: string, orgId: string): Promise<Episode[]> {
  try {
    // Use the proper API endpoint with authentication
    const response = await fetchAPI(`/api/series/${seriesId}/episodes`, {
      headers: {
        'X-Org-Id': orgId
      }
    })
    
    return Array.isArray(response) ? response : []
  } catch (error) {
    console.error('Error fetching episodes:', error)
    return []
  }
}

export default async function UploadPage() {
  const { userId, orgId } = await auth()
  
  if (!userId || !orgId) {
    redirect('/sign-in')
  }
  
  // First, get all series
  const series = await getSeries(orgId)
  
  // Then fetch episodes/chapters for each series and calculate counts
  const seriesWithCounts = await Promise.all(
    series.map(async (s) => {
      const episodes = await getSeriesEpisodes(s.id, orgId)
      
      // Calculate counts based on type
      if (s.type === 'anime') {
        // For anime, count episodes
        const episodeCount = episodes.filter(e => 
          e.status !== 'deleted' && e.status !== 'archived'
        ).length
        
        return {
          ...s,
          episodes,
          episodes_count: episodeCount,
          chapters_count: 0
        }
      } else {
        // For manga/webtoon/light_novel, these are chapters
        const chapterCount = episodes.filter(e => 
          e.status !== 'deleted' && e.status !== 'archived'
        ).length
        
        return {
          ...s,
          chapters: episodes, // Store as chapters for manga/webtoon
          episodes_count: 0,
          chapters_count: chapterCount
        }
      }
    })
  )
  
  return <UploadCenter existingSeries={seriesWithCounts} orgId={orgId} />
}