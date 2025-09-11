// app/(dashboard)/content/page.tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import ContentGrid from '@/components/content-grid'
import { fetchAPI } from '@/lib/api'

type Series = {
  id: string
  title: string
  title_english?: string
  type: 'anime' | 'manga' | 'webtoon' | 'light_novel'
  status: string
  genres?: string
  tags?: string
  cover_image?: string
  view_count: number
  rating?: number
  episodes_count?: number
  chapters_count?: number
  updated_at: string
  created_at: string
  is_premium: boolean
  is_featured: boolean
  published_at?: string
}

async function getContent(orgId: string): Promise<Series[]> {
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

export default async function ContentPage() {
  const { userId, orgId } = await auth()
  
  if (!userId || !orgId) {
    redirect('/sign-in')
  }
  
  const series = await getContent(orgId)
  
  return <ContentGrid initialSeries={series} orgId={orgId} />
}