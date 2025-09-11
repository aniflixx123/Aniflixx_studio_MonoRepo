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
}

type Episode = {
  id: string
  series_id: string
  episode_number: number
  title: string
  video_url?: string
  thumbnail_url?: string
  created_at: string
}

async function getSeries(orgId: string): Promise<Series[]> {
  try {
    const response = await fetchAPI('/api/series', {
      headers: {
        'X-Org-Id': orgId
      }
    })
    return Array.isArray(response) ? response : []
  } catch (error) {
    console.error('Error fetching series:', error)
    return []
  }
}

async function getSeriesEpisodes(seriesId: string): Promise<Episode[]> {
  try {
    // CORRECT API ROUTE FROM YOUR FILES
    const response = await fetch(`/api/series/${seriesId}/episodes`, {
      cache: 'no-store'
    })
    if (!response.ok) return []
    const data = await response.json()
    return Array.isArray(data) ? data : []
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
  
  const series = await getSeries(orgId)
  
  // Fetch episodes for each series
  const seriesWithEpisodes = await Promise.all(
    series.map(async (s) => {
      if (s.type === 'anime') {
        const episodes = await getSeriesEpisodes(s.id)
        return { ...s, episodes }
      }
      // For manga/webtoon, chapters would be similar
      return s
    })
  )
  
  return <UploadCenter existingSeries={seriesWithEpisodes} orgId={orgId} />
}