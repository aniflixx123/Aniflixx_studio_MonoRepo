'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useOrganization } from '@clerk/nextjs'
import { 
  TrendingUp, Users, Eye, DollarSign, Clock, Activity, 
  RefreshCw, BarChart3, Globe, AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts'

const ANALYTICS_API = process.env.NEXT_PUBLIC_ANALYTICS_API || 'https://aniflixx-analytics.black-poetry-4fa5.workers.dev'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

// Type definitions
interface StatsOverview {
  totalViews: number
  uniqueUsers: number
  totalRevenue: number
  totalCoins: number
  transactions: number
  avgSessionTime: number
  completionRate: number
}

interface TopContent {
  id: string
  views: number
  users: number
  completionRate?: number
}

interface ContentStats {
  byType: any[]
  topContent: TopContent[]
}

interface RevenueTimeline {
  date: string
  revenue: number
  coins: number
  transactions: number
}

interface RevenueStats {
  byCountry: any[]
  byMethod: any[]
  timeline: RevenueTimeline[]
}

interface LocationStats {
  country: string
  city: string
  users: number
  events: number
}

interface Demographics {
  byLocation: LocationStats[]
}

interface AnalyticsData {
  overview: StatsOverview
  content: ContentStats
  revenue: RevenueStats
  demographics: Demographics
}

interface RealtimeData {
  activeUsers: number
  eventsPerMinute: number
  totalEvents: number
  locations: { country: string; city: string; count: number }[]
  activeContent?: { contentId: string; contentType: string; users: number }[]
}

export default function AnalyticsPage() {
  const { organization } = useOrganization()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [realtime, setRealtime] = useState<RealtimeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState(30)
  const [lastFetch, setLastFetch] = useState<number>(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Use organization ID directly as studio ID
  const studioId = useMemo(() => organization?.id || '', [organization?.id])

  // Cache check
  const shouldRefetch = useCallback(() => {
    return Date.now() - lastFetch > CACHE_DURATION
  }, [lastFetch])

  // Main data fetching function
  const fetchAnalytics = useCallback(async (force = false) => {
    if (!studioId) {
      setLoading(false)
      return
    }

    // Skip if recently fetched and not forced
    if (!force && !shouldRefetch() && analytics) {
      return
    }

    try {
      setIsRefreshing(true)
      setError(null)

      // Parallel fetch for better performance
      const [statsResponse, realtimeResponse] = await Promise.allSettled([
        fetch(`${ANALYTICS_API}/api/stats/${studioId}?days=${timeRange}`),
        fetch(`${ANALYTICS_API}/api/realtime/${studioId}`)
      ])

      // Handle stats response
      if (statsResponse.status === 'fulfilled' && statsResponse.value.ok) {
        const data:any = await statsResponse.value.json()
        setAnalytics(data)
        setLastFetch(Date.now())
      } else if (statsResponse.status === 'rejected') {
        throw new Error('Failed to fetch analytics data')
      }

      // Handle realtime response (optional - don't fail if it doesn't work)
      if (realtimeResponse.status === 'fulfilled' && realtimeResponse.value.ok) {
        const data:any = await realtimeResponse.value.json()
        setRealtime(data)
      }

    } catch (err) {
      console.error('Analytics error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [studioId, timeRange, shouldRefetch, analytics])

  // Initial load
  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (shouldRefetch()) {
        fetchAnalytics()
      }
    }, CACHE_DURATION)

    return () => clearInterval(interval)
  }, [fetchAnalytics, shouldRefetch])

  // Manual refresh
  const handleRefresh = () => {
    fetchAnalytics(true)
  }

  // Calculate derived metrics
  const metrics = useMemo(() => {
    if (!analytics?.overview) return null

    return {
      viewsPerUser: analytics.overview.uniqueUsers > 0 
        ? (analytics.overview.totalViews / analytics.overview.uniqueUsers).toFixed(1)
        : '0',
      revenuePerTransaction: analytics.overview.transactions > 0
        ? (analytics.overview.totalRevenue / analytics.overview.transactions).toFixed(2)
        : '0',
      engagementRate: analytics.overview.completionRate * 100,
      bounceRate: analytics.overview.uniqueUsers > 0
        ? ((analytics.overview.uniqueUsers - (analytics.overview.totalViews / 2)) / analytics.overview.uniqueUsers * 100).toFixed(1)
        : '0'
    }
  }, [analytics])

  if (loading && !analytics) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium">No Organization Selected</h3>
            <p className="text-gray-500 mt-2">Please select an organization to view analytics</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !analytics) {
    return (
      <div className="p-6">
        <Card className="border-red-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-red-900">Unable to load analytics</h3>
                <p className="text-red-700 mt-1">{error}</p>
                <button 
                  onClick={handleRefresh}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Try Again
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-gray-600">
            {organization.name} • Last {timeRange} days
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(parseInt(e.target.value))}
            className="px-3 py-2 border rounded-lg"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Realtime Alert */}
      {realtime && realtime.activeUsers > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">
                  {realtime.activeUsers} users active now
                </p>
                <p className="text-sm text-green-700">
                  {realtime.eventsPerMinute} events/min from {realtime.locations.length} locations
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Views</p>
                <p className="text-2xl font-bold mt-1">
                  {analytics?.overview.totalViews?.toLocaleString() || 0}
                </p>
                {metrics && (
                  <p className="text-xs text-gray-500 mt-1">
                    {metrics.viewsPerUser} per user
                  </p>
                )}
              </div>
              <Eye className="w-8 h-8 text-blue-100" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unique Users</p>
                <p className="text-2xl font-bold mt-1">
                  {analytics?.overview.uniqueUsers?.toLocaleString() || 0}
                </p>
                {metrics && (
                  <p className="text-xs text-gray-500 mt-1">
                    {metrics.bounceRate}% bounce rate
                  </p>
                )}
              </div>
              <Users className="w-8 h-8 text-green-100" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Revenue</p>
                <p className="text-2xl font-bold mt-1">
                  ${analytics?.overview.totalRevenue?.toFixed(2) || '0.00'}
                </p>
                {metrics && analytics?.overview.transactions ? (
                  <p className="text-xs text-gray-500 mt-1">
                    ${metrics.revenuePerTransaction} per transaction
                  </p>
                ) : null}
              </div>
              <DollarSign className="w-8 h-8 text-yellow-100" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Session</p>
                <p className="text-2xl font-bold mt-1">
                  {Math.round(analytics?.overview.avgSessionTime || 0)}m
                </p>
                {metrics && (
                  <p className="text-xs text-gray-500 mt-1">
                    {metrics.engagementRate.toFixed(0)}% completion
                  </p>
                )}
              </div>
              <Clock className="w-8 h-8 text-purple-100" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Performance & Demographics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Content */}
        <Card>
          <CardHeader>
            <CardTitle>Top Content</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics?.content?.topContent?.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.content.topContent.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="id" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="views" fill="#3b82f6" />
                  <Bar dataKey="users" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No content data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Locations */}
        <Card>
          <CardHeader>
            <CardTitle>Geographic Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics?.demographics?.byLocation?.length ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {analytics.demographics.byLocation.slice(0, 10).map((location: LocationStats, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">
                        {location.city}, {location.country}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{location.users.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{location.events.toLocaleString()} events</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No location data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue Timeline */}
      {analytics?.revenue?.timeline?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.revenue.timeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}