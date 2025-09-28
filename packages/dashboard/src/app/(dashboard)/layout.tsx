
// app/(dashboard)/layout.tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Navigation from '@/components/navigation'
import { fetchAPI } from '@/lib/api'
 
interface Studio {
  id: string
  name: string
  tier: string
  storage_used: number
  storage_total: number
}

interface Stats {
  contentCount: number
  totalViews: number
  publishedCount: number
  draftCount: number
  notificationCount: number
}

async function getStudio(orgId: string): Promise<Studio | null> {
  try {
    const studio = await fetchAPI(`/api/studio/${orgId}`) as Studio
    return studio
  } catch (error) {
    return null
  }
}

async function getStats(orgId: string): Promise<Stats> {
  try {
    // Fetch series for content count
    const seriesResponse = await fetchAPI('/api/series', {
      headers: {
        'X-Org-Id': orgId
      }
    })
    
    const series = Array.isArray(seriesResponse) ? seriesResponse : []
    
    // Calculate stats from series data
    const stats: Stats = {
      contentCount: series.length,
      totalViews: series.reduce((sum: number, s: any) => sum + (s.view_count || 0), 0),
      publishedCount: series.filter((s: any) => s.status === 'published').length,
      draftCount: series.filter((s: any) => s.status === 'draft').length,
      notificationCount: 0 // You can fetch this from a notifications endpoint if available
    }
    
    return stats
  } catch (error) {
    console.error('Error fetching stats:', error)
    return {
      contentCount: 0,
      totalViews: 0,
      publishedCount: 0,
      draftCount: 0,
      notificationCount: 0
    }
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId, orgId } = await auth()
  
  if (!userId || !orgId) {
    redirect('/sign-in')
  }
  
  const studio = await getStudio(orgId)
  const stats = await getStats(orgId)
  
  return (
    <>
      <Navigation studio={studio} stats={stats} />
      {/* Main content wrapper with id for sidebar padding control */}
      <main 
        id="main-content" 
        className="min-h-screen bg-[#0a0a0f] pt-[57px] transition-[padding] duration-200 ease-linear"
      >
        {children}
      </main>
    </>
  )
}