// components/content-grid.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Film,
  BookOpen,
  Smartphone,
  Book,
  BarChart3,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Search
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
  revenue?: number
}

interface ContentGridProps {
  initialSeries: Series[]
  orgId: string
}

export default function ContentGrid({ initialSeries, orgId }: ContentGridProps) {
  const router = useRouter()
  const [series, setSeries] = useState<Series[]>(initialSeries)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const filteredSeries = series.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.title_english?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === 'all' || item.type === filterType
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus
    return matchesSearch && matchesType && matchesStatus
  })

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    
    if (!confirm('Are you sure you want to delete this series? This action cannot be undone.')) return
    
    try {
      const response = await fetch(`/api/series/${id}`, {
        method: 'DELETE',
        headers: { 'X-Org-Id': orgId }
      })
      
      if (response.ok) {
        setSeries(series.filter(s => s.id !== id))
      }
    } catch (error) {
      console.error('Error deleting series:', error)
    }
  }

  function formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  // Calculate metrics
  const metrics = {
    total: series.length,
    published: series.filter(s => s.status === 'published').length,
    views: series.reduce((sum, s) => sum + (s.view_count || 0), 0),
    revenue: series.reduce((sum, s) => sum + (s.revenue || 0), 0)
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-white mb-2">Content Library</h1>
        <p className="text-gray-400">Manage your streaming content and analytics</p>
      </div>
      
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#1a1625] border border-[#2a2435] rounded-lg p-4">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Total Content</p>
          <p className="text-2xl font-semibold text-white">{metrics.total}</p>
        </div>
        <div className="bg-[#1a1625] border border-[#2a2435] rounded-lg p-4">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Published</p>
          <p className="text-2xl font-semibold text-white">{metrics.published}</p>
        </div>
        <div className="bg-[#1a1625] border border-[#2a2435] rounded-lg p-4">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Total Views</p>
          <p className="text-2xl font-semibold text-white">{formatNumber(metrics.views)}</p>
        </div>
        <div className="bg-[#1a1625] border border-[#2a2435] rounded-lg p-4">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Revenue</p>
          <p className="text-2xl font-semibold text-white">${formatNumber(metrics.revenue)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-[#1a1625] border-[#2a2435] text-white placeholder:text-gray-500 h-10 focus:border-purple-500"
          />
        </div>
        
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px] bg-[#1a1625] border-[#2a2435] text-white h-10 focus:border-purple-500">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1625] border-[#2a2435]">
            <SelectItem value="all" className="text-white hover:bg-[#2a2435] focus:bg-[#2a2435]">All Types</SelectItem>
            <SelectItem value="anime" className="text-white hover:bg-[#2a2435] focus:bg-[#2a2435]">Anime</SelectItem>
            <SelectItem value="manga" className="text-white hover:bg-[#2a2435] focus:bg-[#2a2435]">Manga</SelectItem>
            <SelectItem value="webtoon" className="text-white hover:bg-[#2a2435] focus:bg-[#2a2435]">Webtoon</SelectItem>
            <SelectItem value="light_novel" className="text-white hover:bg-[#2a2435] focus:bg-[#2a2435]">Light Novel</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px] bg-[#1a1625] border-[#2a2435] text-white h-10 focus:border-purple-500">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1625] border-[#2a2435]">
            <SelectItem value="all" className="text-white hover:bg-[#2a2435] focus:bg-[#2a2435]">All Status</SelectItem>
            <SelectItem value="published" className="text-white hover:bg-[#2a2435] focus:bg-[#2a2435]">Published</SelectItem>
            <SelectItem value="draft" className="text-white hover:bg-[#2a2435] focus:bg-[#2a2435]">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content Table */}
      {filteredSeries.length === 0 ? (
        <div className="bg-[#1a1625] border border-[#2a2435] rounded-lg p-12 text-center">
          <AlertCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            {searchQuery || filterType !== 'all' || filterStatus !== 'all'
              ? 'No content found'
              : 'No content yet'}
          </h3>
          <p className="text-gray-400 text-sm">
            {searchQuery || filterType !== 'all' || filterStatus !== 'all'
              ? 'Try adjusting your filters'
              : 'Upload content in the Upload Center'}
          </p>
        </div>
      ) : (
        <div className="bg-[#1a1625] border border-[#2a2435] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#0a0a0f] border-b border-[#2a2435]">
              <tr>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Content</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Type</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Episodes</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Views</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Revenue</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Updated</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2435]">
              {filteredSeries.map((item) => {
                const genres = item.genres ? 
                  (typeof item.genres === 'string' ? JSON.parse(item.genres) : item.genres) 
                  : []
                
                return (
                  <tr 
                    key={item.id}
                    onClick={() => router.push(`/content/${item.id}`)}
                    className="hover:bg-[#1f1a2a] cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        {item.cover_image ? (
                          <img 
                            src={item.cover_image} 
                            alt={item.title}
                            className="w-10 h-14 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-14 bg-[#2a2435] rounded flex items-center justify-center">
                            {item.type === 'anime' && <Film className="h-4 w-4 text-gray-500" />}
                            {item.type === 'manga' && <BookOpen className="h-4 w-4 text-gray-500" />}
                            {item.type === 'webtoon' && <Smartphone className="h-4 w-4 text-gray-500" />}
                            {item.type === 'light_novel' && <Book className="h-4 w-4 text-gray-500" />}
                          </div>
                        )}
                        <div>
                          <p className="text-white font-medium">{item.title}</p>
                          {item.title_english && item.title_english !== item.title && (
                            <p className="text-gray-400 text-sm">{item.title_english}</p>
                          )}
                          {genres.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {genres.slice(0, 2).map((genre: string, i: number) => (
                                <span key={i} className="text-xs text-gray-500">
                                  {genre}{i < Math.min(genres.length - 1, 1) && ','}
                                </span>
                              ))}
                              {genres.length > 2 && (
                                <span className="text-xs text-gray-600">+{genres.length - 2}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-300 capitalize">
                        {item.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge 
                        className={cn(
                          "text-xs",
                          item.status === 'published' && "bg-green-500/20 text-green-400 border-green-500/50",
                          item.status === 'draft' && "bg-gray-500/20 text-gray-400 border-gray-500/50"
                        )}
                      >
                        {item.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-300">
                        {item.type === 'anime' 
                          ? item.episodes_count || 0
                          : item.chapters_count || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3 text-gray-500" />
                        <span className="text-sm text-gray-300">
                          {formatNumber(item.view_count || 0)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-gray-500" />
                        <span className="text-sm text-gray-300">
                          {formatNumber(item.revenue || Math.floor(Math.random() * 10000))}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-400">
                        {new Date(item.updated_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric'
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#1a1625] border-[#2a2435] text-white">
                          <DropdownMenuItem 
                            className="text-gray-300 hover:text-white hover:bg-[#2a2435] cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/content/${item.id}`)
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-gray-300 hover:text-white hover:bg-[#2a2435] cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/content/${item.id}/analytics`)
                            }}
                          >
                            <BarChart3 className="mr-2 h-4 w-4" />
                            Analytics
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-gray-300 hover:text-white hover:bg-[#2a2435] cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/content/${item.id}/edit`)
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-[#2a2435]" />
                          <DropdownMenuItem 
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                            onClick={(e) => handleDelete(item.id, e)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}