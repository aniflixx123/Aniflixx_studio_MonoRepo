// app/(dashboard)/dashboard/page.tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { fetchAPI } from '@/lib/api'

type DashboardData = {
  series: any[]
  recentActivity: any[]
  analytics: {
    totalViews: number
    totalLikes: number
    totalComments: number
    viewsGrowth: number
  }
}

async function getDashboardData(orgId: string): Promise<DashboardData> {
  try {
    // Fetch series data
    const series = await fetchAPI('/api/series', {
      headers: { 'X-Org-Id': orgId }
    }) as any[]
    
    // Fetch recent activity
    const recentActivity:any = await fetchAPI('/api/activity/recent', {
      headers: { 'X-Org-Id': orgId }
    }).catch(() => [])
    
    // Calculate analytics
    const analytics = {
      totalViews: series?.reduce((sum: number, item: any) => sum + (item.view_count || 0), 0) || 0,
      totalLikes: series?.reduce((sum: number, item: any) => sum + (item.like_count || 0), 0) || 0,
      totalComments: series?.reduce((sum: number, item: any) => sum + (item.comment_count || 0), 0) || 0,
      viewsGrowth: 0 // Calculate based on historical data if available
    }
    
    return {
      series: series || [],
      recentActivity: recentActivity || [],
      analytics
    }
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return {
      series: [],
      recentActivity: [],
      analytics: {
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        viewsGrowth: 0
      }
    }
  }
}

export default async function DashboardPage() {
  const { userId, orgId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }
  
  if (!orgId) {
    redirect('/create-studio')
  }
  
  const dashboardData = await getDashboardData(orgId)
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400">Welcome back! Here's an overview of your content performance.</p>
      </div>
      
      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-[#1a1a2e] rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Views</span>
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-white">{dashboardData.analytics.totalViews.toLocaleString()}</div>
          {dashboardData.analytics.viewsGrowth > 0 && (
            <div className="text-sm text-green-500 mt-1">
              +{dashboardData.analytics.viewsGrowth}% from last month
            </div>
          )}
        </div>
        
        <div className="bg-[#1a1a2e] rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Likes</span>
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-white">{dashboardData.analytics.totalLikes.toLocaleString()}</div>
        </div>
        
        <div className="bg-[#1a1a2e] rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Comments</span>
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-white">{dashboardData.analytics.totalComments.toLocaleString()}</div>
        </div>
        
        <div className="bg-[#1a1a2e] rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Series</span>
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-white">{dashboardData.series.length}</div>
        </div>
      </div>
      
      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Series */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold text-white mb-4">Recent Series</h2>
          {dashboardData.series.length > 0 ? (
            <div className="space-y-4">
              {dashboardData.series.slice(0, 5).map((item: any) => (
                <div key={item.id} className="bg-[#1a1a2e] rounded-lg p-4 border border-gray-800 hover:border-gray-700 transition-colors">
                  <div className="flex items-start space-x-4">
                    {item.thumbnail && (
                      <img 
                        src={item.thumbnail} 
                        alt={item.title}
                        className="w-24 h-16 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-medium text-white mb-1">{item.title}</h3>
                      <p className="text-sm text-gray-400 mb-2 line-clamp-2">{item.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>{item.view_count || 0} views</span>
                        <span>{item.episode_count || 0} episodes</span>
                        <span className={`px-2 py-1 rounded ${
                          item.status === 'published' ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#1a1a2e] rounded-lg p-8 border border-gray-800 text-center">
              <p className="text-gray-400">No series yet. Create your first series to get started!</p>
            </div>
          )}
        </div>
        
        {/* Recent Activity */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Recent Activity</h2>
          {dashboardData.recentActivity.length > 0 ? (
            <div className="bg-[#1a1a2e] rounded-lg p-4 border border-gray-800">
              <div className="space-y-4">
                {dashboardData.recentActivity.map((activity: any, index: number) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-300">{activity.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-[#1a1a2e] rounded-lg p-8 border border-gray-800 text-center">
              <p className="text-gray-400 text-sm">No recent activity</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}