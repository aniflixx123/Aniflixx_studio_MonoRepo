// app/(dashboard)/layout.tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Navigation from '@/components/navigation'
import { fetchAPI } from '@/lib/api'

type Studio = {
  id: string
  clerk_org_id: string
  name: string
  slug: string
  tier: string
  max_users: number
  storage_used: number
  storage_total: number
  created_at: string
}

type DashboardStats = {
  contentCount: number
  totalViews: number
  publishedCount: number
  draftCount: number
  notificationCount: number
}

async function getStudioData(orgId: string): Promise<Studio | null> {
  try {
    const studio = await fetchAPI(`/api/studio/${orgId}`) as Studio
    return studio
  } catch (error) {
    return null
  }
}

async function getDashboardStats(orgId: string): Promise<DashboardStats> {
  try {
    // Fetch all series
    const series = await fetchAPI('/api/series', {
      headers: { 'X-Org-Id': orgId }
    }) as any[]
    
    const contentCount = Array.isArray(series) ? series.length : 0
    const totalViews = series?.reduce((sum: number, item: any) => sum + (item.view_count || 0), 0) || 0
    const publishedCount = series?.filter((item: any) => item.status === 'published').length || 0
    const draftCount = series?.filter((item: any) => item.status === 'draft').length || 0
    
    // Fetch notification count
    let notificationCount = 0
    try {
      const notif = await fetchAPI('/api/notifications/count', {
        headers: { 'X-Org-Id': orgId }
      }) as { count: number }
      notificationCount = notif.count || 0
    } catch {}
    
    return {
      contentCount,
      totalViews,
      publishedCount,
      draftCount,
      notificationCount
    }
  } catch (error) {
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
  
  if (!userId) {
    redirect('/sign-in')
  }
  
  let studio: Studio | null = null
  let stats: DashboardStats = {
    contentCount: 0,
    totalViews: 0,
    publishedCount: 0,
    draftCount: 0,
    notificationCount: 0
  }
  
  if (orgId) {
    studio = await getStudioData(orgId)
    stats = await getDashboardStats(orgId)
  }
  
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navigation 
        studio={studio}
        stats={stats}
      />
      <main className="transition-all duration-300">
        {children}
      </main>
    </div>
  )
}