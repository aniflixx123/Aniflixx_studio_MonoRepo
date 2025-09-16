'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Upload, Film, FileText, PlayCircle, Plus, X, ChevronDown,
  Image, Grid, List, Eye, Edit, Trash2, ChevronRight,
  CheckCircle, AlertCircle, Clock, ArrowUpDown, Move,
  Replace, Layers, Save, RefreshCw, GripVertical
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

type PageData = {
  number: number
  original: string
  mobile?: string
  thumbnail?: string
  size?: number
}

type Episode = {
  id: string
  series_id: string
  episode_number: number
  title: string
  video_path?: string
  thumbnail_url?: string
  created_at: string
  page_count?: number
  status?: string
}

type Chapter = {
  id: string
  series_id: string
  episode_number: number
  title: string
  page_count?: number
  created_at: string
  status?: string
  video_path?: string
}

type Series = {
  id: string
  title: string
  title_english?: string
  type: 'anime' | 'manga' | 'webtoon' | 'light_novel'
  status: string
  episodes_count?: number
  chapters_count?: number
  episodes?: Episode[]
  chapters?: Chapter[]
}

interface UploadCenterProps {
  existingSeries: Series[]
  orgId: string
}

const GENRE_OPTIONS = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror',
  'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports',
  'Supernatural', 'Thriller', 'Historical', 'Mecha', 'Music'
]

export default function UploadCenter({ existingSeries, orgId }: UploadCenterProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('upload')
  const [uploadType, setUploadType] = useState<'new' | 'existing'>('existing')
  const [contentAction, setContentAction] = useState<'new-chapter' | 'manage-chapter'>('new-chapter')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  
  // Chapter management state
  const [chapterPages, setChapterPages] = useState<PageData[]>([])
  const [draggedPage, setDraggedPage] = useState<number | null>(null)
  const [selectedPageForAction, setSelectedPageForAction] = useState<number | null>(null)
  const [isLoadingPages, setIsLoadingPages] = useState(false)
  const [isSavingOrder, setIsSavingOrder] = useState(false)
  
  // Series form state
  const [formData, setFormData] = useState({
    title: '',
    titleEnglish: '',
    type: 'manga' as 'anime' | 'manga' | 'webtoon' | 'light_novel',
    description: '',
    genres: [] as string[],
    tags: '',
    isPremium: false,
    isFeatured: false
  })
  
  // Episode/Chapter state
  const [selectedSeries, setSelectedSeries] = useState('')
  const [selectedChapter, setSelectedChapter] = useState('')
  const [episodeData, setEpisodeData] = useState({
    title: '',
    number: '',
    description: '',
    releaseDate: new Date().toISOString().split('T')[0]
  })
  
  // File management
  const [files, setFiles] = useState<{
    cover?: File
    video?: File
    thumbnail?: File
    chapters?: File[]
  }>({})
  
  const [dragActive, setDragActive] = useState(false)

  // Get selected series data
  const selectedSeriesData = existingSeries.find(s => s.id === selectedSeries)
  const isAnime = selectedSeriesData?.type === 'anime'
  const existingChapters = selectedSeriesData?.chapters || selectedSeriesData?.episodes || []
  
  // Calculate next episode/chapter number
  useEffect(() => {
    if (selectedSeriesData && contentAction === 'new-chapter') {
      const nextNumber = isAnime 
        ? (selectedSeriesData.episodes_count || 0) + 1
        : (selectedSeriesData.chapters_count || 0) + 1
      setEpisodeData(prev => ({ ...prev, number: nextNumber.toString() }))
    }
  }, [selectedSeries, selectedSeriesData, isAnime, contentAction])

  // Fetch chapter pages when a chapter is selected
  useEffect(() => {
    if (selectedChapter && contentAction === 'manage-chapter') {
      fetchChapterPages()
    }
  }, [selectedChapter, contentAction])

  // Fetch existing chapter pages
  async function fetchChapterPages() {
    if (!selectedChapter) return
    
    setIsLoadingPages(true)
    try {
      const response = await fetch(`/api/episodes/${selectedChapter}`)
      if (response.ok) {
        const data:any = await response.json()
        
        // Parse pages from video_path
        if (data.video_path) {
          try {
            const videoPath = data.video_path
            if (videoPath.startsWith('{')) {
              const chapterData = JSON.parse(videoPath)
              setChapterPages(chapterData.pages || [])
            } else if (videoPath.startsWith('[')) {
              const paths = JSON.parse(videoPath)
              setChapterPages(paths.map((path: string, index: number) => ({
                number: index + 1,
                original: path
              })))
            }
          } catch (e) {
            console.error('Error parsing pages:', e)
            setChapterPages([])
          }
        }
      }
    } catch (error) {
      console.error('Error fetching chapter pages:', error)
    } finally {
      setIsLoadingPages(false)
    }
  }

  // Calculate real stats
  const totalEpisodes = existingSeries.reduce((acc, s) => acc + (s.episodes_count || 0), 0)
  const totalChapters = existingSeries.reduce((acc, s) => acc + (s.chapters_count || 0), 0)

  // Drag and drop handlers for file upload
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, type: 'video' | 'cover' | 'chapters') => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    if (type === 'chapters') {
      setFiles(prev => ({ ...prev, chapters: droppedFiles }))
    } else {
      setFiles(prev => ({ ...prev, [type]: droppedFiles[0] }))
    }
  }, [])

  // Page reordering handlers
  const handlePageDragStart = (e: React.DragEvent<HTMLDivElement>, pageNumber: number) => {
    setDraggedPage(pageNumber)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handlePageDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handlePageDrop = async (e: React.DragEvent<HTMLDivElement>, targetPageNumber: number) => {
    e.preventDefault()
    
    if (draggedPage === null || draggedPage === targetPageNumber) return
    
    const draggedIndex = chapterPages.findIndex(p => p.number === draggedPage)
    const targetIndex = chapterPages.findIndex(p => p.number === targetPageNumber)
    
    if (draggedIndex === -1 || targetIndex === -1) return
    
    // Reorder pages
    const newPages = [...chapterPages]
    const [movedPage] = newPages.splice(draggedIndex, 1)
    newPages.splice(targetIndex, 0, movedPage)
    
    // Renumber
    const renumberedPages = newPages.map((page, index) => ({
      ...page,
      number: index + 1
    }))
    
    setChapterPages(renumberedPages)
    setDraggedPage(null)
    
    // Save new order
    await savePageOrder(renumberedPages)
  }

  const savePageOrder = async (orderedPages: PageData[]) => {
    if (!selectedChapter) return
    
    setIsSavingOrder(true)
    try {
      const response = await fetch(`/api/episodes/${selectedChapter}/reorder-pages`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pageOrder: orderedPages.map((_, index) => index)
        })
      })
      
      if (response.ok) {
        // Show success feedback
        console.log('Page order saved')
      }
    } catch (error) {
      console.error('Error saving order:', error)
    } finally {
      setIsSavingOrder(false)
    }
  }

  // Replace specific page
  const replacePage = async (pageNumber: number) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement
      const file = target.files?.[0]
      if (!file || !selectedChapter) return
      
      const formData = new FormData()
      formData.append('page', file)
      
      try {
        const response = await fetch(`/api/episodes/${selectedChapter}/pages/${pageNumber}`, {
          method: 'PUT',
          body: formData
        })
        
        if (response.ok) {
          fetchChapterPages()
          // Show success message
        }
      } catch (error) {
        console.error('Error replacing page:', error)
      }
    }
    
    input.click()
  }

  // Delete specific page
  const deletePage = async (pageNumber: number) => {
    if (!confirm(`Delete page ${pageNumber}? This will renumber all following pages.`)) return
    if (!selectedChapter) return
    
    try {
      const response = await fetch(`/api/episodes/${selectedChapter}/pages/${pageNumber}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        fetchChapterPages()
      }
    } catch (error) {
      console.error('Error deleting page:', error)
    }
  }

  // Handle adding pages to existing chapter
  async function handleAddPagesToChapter(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedChapter || !files.chapters || files.chapters.length === 0) return
    
    setIsUploading(true)
    setUploadProgress(0)
    setUploadStatus('uploading')
    
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => prev >= 90 ? 90 : prev + 10)
    }, 300)
    
    try {
      const formData = new FormData()
      files.chapters.forEach((file, i) => {
        formData.append(`page_${i}`, file)
      })
      formData.append('totalPages', files.chapters.length.toString())
      
      const response = await fetch(`/api/upload/chapter/${selectedChapter}/pages`, {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        setUploadProgress(100)
        setUploadStatus('success')
        setFiles({}) // Clear files
        fetchChapterPages() // Refresh pages
        setTimeout(() => {
          setUploadStatus('idle')
          setUploadProgress(0)
        }, 2000)
      } else {
        throw new Error('Failed to add pages')
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus('error')
    } finally {
      clearInterval(progressInterval)
      setIsUploading(false)
    }
  }

  // Handle series creation (existing code)
  async function handleSeriesSubmit(e: React.FormEvent) {
    e.preventDefault()
    // ... existing series creation code ...
  }
  
  // Handle episode/chapter upload (existing code)
  async function handleEpisodeSubmit(e: React.FormEvent) {
    e.preventDefault()
    // ... existing episode upload code ...
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-white mb-2">Upload Center</h1>
          <p className="text-gray-400">Upload and manage your content professionally</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-[#1a1625] to-[#2a2435] border-[#3a3445] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Total Series</p>
                <p className="text-3xl font-bold text-white mt-1">{existingSeries.length}</p>
                <p className="text-xs text-green-400 mt-2">+12% from last month</p>
              </div>
              <div className="bg-purple-500/20 p-3 rounded-xl">
                <Film className="h-8 w-8 text-purple-400" />
              </div>
            </div>
          </Card>
          <Card className="bg-gradient-to-br from-[#1a1625] to-[#2a2435] border-[#3a3445] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Total Episodes</p>
                <p className="text-3xl font-bold text-white mt-1">{totalEpisodes}</p>
                <p className="text-xs text-blue-400 mt-2">Active content</p>
              </div>
              <div className="bg-blue-500/20 p-3 rounded-xl">
                <PlayCircle className="h-8 w-8 text-blue-400" />
              </div>
            </div>
          </Card>
          <Card className="bg-gradient-to-br from-[#1a1625] to-[#2a2435] border-[#3a3445] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Total Chapters</p>
                <p className="text-3xl font-bold text-white mt-1">{totalChapters}</p>
                <p className="text-xs text-emerald-400 mt-2">Growing library</p>
              </div>
              <div className="bg-emerald-500/20 p-3 rounded-xl">
                <FileText className="h-8 w-8 text-emerald-400" />
              </div>
            </div>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-[#1a1625] border border-[#2a2435] mb-6">
            <TabsTrigger value="upload">Upload Content</TabsTrigger>
            <TabsTrigger value="manage">Manage Existing</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            {/* Upload Type Selection */}
            <div className="grid grid-cols-2 gap-4">
              <Card 
                className={cn(
                  "bg-gradient-to-br from-[#1a1625] to-[#2a2435] border-2 p-6 cursor-pointer transition-all transform hover:scale-[1.02]",
                  uploadType === 'existing' ? "border-purple-500 shadow-lg shadow-purple-500/20" : "border-[#3a3445] hover:border-purple-400/50"
                )}
                onClick={() => setUploadType('existing')}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "p-3 rounded-xl transition-colors",
                    uploadType === 'existing' ? "bg-purple-500/20" : "bg-[#2a2435]"
                  )}>
                    <Upload className={cn(
                      "h-8 w-8",
                      uploadType === 'existing' ? "text-purple-400" : "text-gray-400"
                    )} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-2">Add to Existing Series</h3>
                    <p className="text-gray-400 text-sm mb-3">Upload episodes or chapters to current series</p>
                    {uploadType === 'existing' && (
                      <div className="flex gap-2">
                        <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">Quick Upload</span>
                        <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">Page Management</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
              
              <Card 
                className={cn(
                  "bg-gradient-to-br from-[#1a1625] to-[#2a2435] border-2 p-6 cursor-pointer transition-all transform hover:scale-[1.02]",
                  uploadType === 'new' ? "border-blue-500 shadow-lg shadow-blue-500/20" : "border-[#3a3445] hover:border-blue-400/50"
                )}
                onClick={() => setUploadType('new')}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "p-3 rounded-xl transition-colors",
                    uploadType === 'new' ? "bg-blue-500/20" : "bg-[#2a2435]"
                  )}>
                    <Plus className={cn(
                      "h-8 w-8",
                      uploadType === 'new' ? "text-blue-400" : "text-gray-400"
                    )} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-2">Create New Series</h3>
                    <p className="text-gray-400 text-sm mb-3">Start a fresh anime or manga series</p>
                    {uploadType === 'new' && (
                      <div className="flex gap-2">
                        <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">Full Setup</span>
                        <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">Metadata</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* Upload Forms */}
            {uploadType === 'existing' ? (
              <Card className="bg-[#1a1625] border-[#2a2435] p-6">
                <form onSubmit={contentAction === 'new-chapter' ? handleEpisodeSubmit : handleAddPagesToChapter} className="space-y-6">
                  {/* Series Selection */}
                  <div>
                    <Label className="text-white mb-2">Select Series</Label>
                    <Select value={selectedSeries} onValueChange={(value) => {
                      setSelectedSeries(value)
                      setSelectedChapter('') // Reset chapter selection
                      setChapterPages([]) // Clear pages
                    }}>
                      <SelectTrigger className="bg-[#0a0a0f] border-[#2a2435] text-white">
                        <SelectValue placeholder="Choose a series" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1625] border-[#2a2435]">
                        {existingSeries.map(series => (
                          <SelectItem key={series.id} value={series.id} className="text-white hover:bg-[#2a2435]">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-xs px-2 py-0.5 rounded",
                                series.type === 'anime' ? "bg-purple-500/20 text-purple-300" :
                                series.type === 'manga' ? "bg-blue-500/20 text-blue-300" :
                                "bg-emerald-500/20 text-emerald-300"
                              )}>
                                {series.type}
                              </span>
                              <span>{series.title}</span>
                              {series.episodes_count || series.chapters_count ? (
                                <span className="text-gray-400 text-sm">
                                  ({series.episodes_count || series.chapters_count} {series.type === 'anime' ? 'episodes' : 'chapters'})
                                </span>
                              ) : null}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedSeries && !isAnime && (
                    <>
                      {/* Content Action Selection */}
                      <div className="bg-[#0a0a0f] rounded-lg p-4 space-y-4">
                        <Label className="text-white mb-2">What would you like to do?</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <Card
                            className={cn(
                              "p-4 cursor-pointer transition-all border-2",
                              contentAction === 'new-chapter' ? 
                                "border-purple-500 bg-purple-500/10" : 
                                "border-[#2a2435] hover:border-purple-400/50"
                            )}
                            onClick={() => {
                              setContentAction('new-chapter')
                              setChapterPages([])
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <Plus className="h-5 w-5 text-purple-400" />
                              <div>
                                <p className="text-white font-medium">Create New Chapter</p>
                                <p className="text-gray-400 text-xs">Upload a brand new chapter</p>
                              </div>
                            </div>
                          </Card>
                          
                          <Card
                            className={cn(
                              "p-4 cursor-pointer transition-all border-2",
                              contentAction === 'manage-chapter' ? 
                                "border-emerald-500 bg-emerald-500/10" : 
                                "border-[#2a2435] hover:border-emerald-400/50"
                            )}
                            onClick={() => setContentAction('manage-chapter')}
                          >
                            <div className="flex items-center gap-3">
                              <Layers className="h-5 w-5 text-emerald-400" />
                              <div>
                                <p className="text-white font-medium">Manage Existing Chapter</p>
                                <p className="text-gray-400 text-xs">View, reorder, or add pages</p>
                              </div>
                            </div>
                          </Card>
                        </div>
                      </div>

                      {/* Chapter Management Section */}
                      {contentAction === 'manage-chapter' && existingChapters.length > 0 && (
                        <div className="space-y-4">
                          <div>
                            <Label className="text-white mb-2">Select Chapter to Manage</Label>
                            <div className="bg-[#0a0a0f] rounded-lg border border-[#2a2435] max-h-64 overflow-y-auto">
                              {existingChapters.map((chapter) => (
                                <div
                                  key={chapter.id}
                                  className={cn(
                                    "p-4 border-b border-[#2a2435] cursor-pointer transition-all hover:bg-[#1a1625]",
                                    selectedChapter === chapter.id && "bg-purple-500/10 border-purple-500"
                                  )}
                                  onClick={() => setSelectedChapter(chapter.id)}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="text-white">
                                        <span className="font-medium">Chapter {chapter.episode_number}</span>
                                        {chapter.title && <span className="text-gray-400 ml-2">- {chapter.title}</span>}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {chapter.page_count && (
                                        <span className="text-xs bg-[#2a2435] px-2 py-1 rounded text-gray-300">
                                          {chapter.page_count} pages
                                        </span>
                                      )}
                                      {chapter.status && (
                                        <span className={cn(
                                          "text-xs px-2 py-1 rounded",
                                          chapter.status === 'published' ? "bg-green-500/20 text-green-300" :
                                          chapter.status === 'draft' ? "bg-yellow-500/20 text-yellow-300" :
                                          "bg-gray-500/20 text-gray-300"
                                        )}>
                                          {chapter.status}
                                        </span>
                                      )}
                                      <ChevronRight className="h-4 w-4 text-gray-400" />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Current Chapter Pages */}
                          {selectedChapter && (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h3 className="text-white font-medium flex items-center gap-2">
                                  <Layers className="h-5 w-5 text-emerald-400" />
                                  Current Chapter Pages
                                  {isLoadingPages && (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                  )}
                                </h3>
                                {chapterPages.length > 0 && (
                                  <div className="flex items-center gap-2">
                                    {isSavingOrder && (
                                      <span className="text-xs text-gray-400 flex items-center gap-1">
                                        <RefreshCw className="h-3 w-3 animate-spin" />
                                        Saving order...
                                      </span>
                                    )}
                                    <span className="text-xs bg-[#2a2435] px-2 py-1 rounded text-gray-300">
                                      {chapterPages.length} pages • Drag to reorder
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="bg-[#0a0a0f] rounded-lg p-4 min-h-[200px]">
                                {chapterPages.length === 0 ? (
                                  <div className="text-center py-8 text-gray-500">
                                    <Image className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                                    <p>No pages in this chapter yet</p>
                                    <p className="text-sm mt-2">Add pages using the upload area below</p>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                                    {chapterPages.map((page) => (
                                      <div
                                        key={page.number}
                                        draggable
                                        onDragStart={(e) => handlePageDragStart(e, page.number)}
                                        onDragOver={handlePageDragOver}
                                        onDrop={(e) => handlePageDrop(e, page.number)}
                                        className={cn(
                                          "relative group cursor-move border-2 rounded-lg overflow-hidden transition-all",
                                          draggedPage === page.number ? "opacity-50" : "",
                                          selectedPageForAction === page.number ? "border-purple-500 shadow-lg" : "border-[#2a2435] hover:border-purple-400"
                                        )}
                                        onClick={() => setSelectedPageForAction(
                                          selectedPageForAction === page.number ? null : page.number
                                        )}
                                      >
                                        <div className="aspect-[3/4] bg-[#1a1625]">
                                          <img
                                            src={`${process.env.NEXT_PUBLIC_API_URL}/api/files/${
                                              page.thumbnail || page.original
                                            }`}
                                            alt={`Page ${page.number}`}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                            onError={(e) => {
                                              const target = e.target as HTMLImageElement
                                              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHRleHQtYW5jaG9yPSJtaWRkbGUiIHg9IjEwMCIgeT0iMTUwIiBzdHlsZT0iZmlsbDojYWFhO2ZvbnQtZmFtaWx5OkFyaWFsLHNhbnMtc2VyaWY7Zm9udC1zaXplOjEzcHg7Ij5ObyBQcmV2aWV3PC90ZXh0Pjwvc3ZnPg=='
                                            }}
                                          />
                                        </div>
                                        
                                        {/* Page Number Badge */}
                                        <div className="absolute top-1 left-1 bg-black bg-opacity-75 text-white px-1.5 py-0.5 rounded text-xs font-medium">
                                          {page.number}
                                        </div>
                                        
                                        {/* Drag Handle */}
                                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <GripVertical className="h-4 w-4 text-white drop-shadow-lg" />
                                        </div>
                                        
                                        {/* Page Actions */}
                                        {selectedPageForAction === page.number && (
                                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-1">
                                            <div className="flex gap-1 justify-center">
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  replacePage(page.number)
                                                }}
                                                className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs hover:bg-blue-700 transition-colors"
                                              >
                                                Replace
                                              </button>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  deletePage(page.number)
                                                }}
                                                className="bg-red-600 text-white px-2 py-0.5 rounded text-xs hover:bg-red-700 transition-colors"
                                              >
                                                Delete
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Instructions */}
                              {chapterPages.length > 0 && (
                                <Alert className="bg-blue-500/10 border-blue-500/50">
                                  <AlertCircle className="h-4 w-4 text-blue-400" />
                                  <AlertDescription className="text-gray-300 text-sm">
                                    <strong>Tips:</strong> Drag pages to reorder • Click a page to see options • Changes save automatically
                                  </AlertDescription>
                                </Alert>
                              )}

                              <Separator className="bg-[#2a2435]" />

                              {/* Add New Pages Section */}
                              <div>
                                <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                                  <Plus className="h-5 w-5 text-purple-400" />
                                  Add New Pages to Chapter
                                </h3>
                                <div
                                  className={cn(
                                    "border-2 border-dashed rounded-lg p-8 transition-all",
                                    dragActive ? "border-purple-500 bg-purple-500/10" : "border-[#2a2435] hover:border-[#3a3445]",
                                    files.chapters && files.chapters.length > 0 && "border-green-500 bg-green-500/10"
                                  )}
                                  onDragEnter={handleDrag}
                                  onDragLeave={handleDrag}
                                  onDragOver={handleDrag}
                                  onDrop={(e) => handleDrop(e, 'chapters')}
                                >
                                  {files.chapters && files.chapters.length > 0 ? (
                                    <div className="space-y-4">
                                      <div className="flex items-center justify-center gap-2">
                                        <CheckCircle className="h-8 w-8 text-green-400" />
                                        <p className="text-white font-medium">
                                          {files.chapters.length} new pages selected
                                        </p>
                                      </div>
                                      <div className="grid grid-cols-6 gap-2 max-h-32 overflow-y-auto">
                                        {files.chapters.slice(0, 12).map((file, idx) => (
                                          <div key={idx} className="aspect-[3/4] bg-[#2a2435] rounded overflow-hidden">
                                            <img
                                              src={URL.createObjectURL(file)}
                                              alt={`New page ${idx + 1}`}
                                              className="w-full h-full object-cover"
                                            />
                                          </div>
                                        ))}
                                        {files.chapters.length > 12 && (
                                          <div className="aspect-[3/4] flex items-center justify-center bg-[#2a2435] rounded">
                                            <span className="text-gray-400 text-sm">+{files.chapters.length - 12}</span>
                                          </div>
                                        )}
                                      </div>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setFiles(prev => ({ ...prev, chapters: [] }))}
                                        className="text-red-400 border-red-400 hover:bg-red-400/10 w-full"
                                      >
                                        <X className="h-4 w-4 mr-1" />
                                        Remove All New Pages
                                      </Button>
                                    </div>
                                  ) : (
                                    <>
                                      <Image className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                      <p className="text-white mb-2 text-center">
                                        Drag & drop new pages here
                                      </p>
                                      <p className="text-gray-400 text-sm mb-4 text-center">
                                        JPG, PNG, WEBP (Multiple files)
                                      </p>
                                      <Input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={(e) => {
                                          const fileList = Array.from(e.target.files || [])
                                          setFiles(prev => ({ ...prev, chapters: fileList }))
                                        }}
                                        className="hidden"
                                        id="chapter-upload"
                                      />
                                      <Label htmlFor="chapter-upload" className="flex justify-center">
                                        <Button type="button" variant="outline" className="bg-purple-600 hover:bg-purple-700 text-white border-0">
                                          Browse Files
                                        </Button>
                                      </Label>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* New Chapter Form (existing code) */}
                      {contentAction === 'new-chapter' && selectedSeries && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-white mb-2">Chapter Number</Label>
                              <Input
                                type="number"
                                value={episodeData.number}
                                onChange={(e) => setEpisodeData(prev => ({ ...prev, number: e.target.value }))}
                                className="bg-[#0a0a0f] border-[#2a2435] text-white"
                                required
                              />
                            </div>
                            <div>
                              <Label className="text-white mb-2">Title</Label>
                              <Input
                                value={episodeData.title}
                                onChange={(e) => setEpisodeData(prev => ({ ...prev, title: e.target.value }))}
                                className="bg-[#0a0a0f] border-[#2a2435] text-white"
                                placeholder="Chapter title"
                                required
                              />
                            </div>
                          </div>

                          {/* Chapter Pages Upload for new chapter */}
                          <div>
                            <Label className="text-white mb-2">Chapter Pages</Label>
                            <div
                              className={cn(
                                "border-2 border-dashed rounded-lg p-8 transition-all",
                                dragActive ? "border-purple-500 bg-purple-500/10" : "border-[#2a2435] hover:border-[#3a3445]",
                                files.chapters && files.chapters.length > 0 && "border-green-500 bg-green-500/10"
                              )}
                              onDragEnter={handleDrag}
                              onDragLeave={handleDrag}
                              onDragOver={handleDrag}
                              onDrop={(e) => handleDrop(e, 'chapters')}
                            >
                              {/* Similar upload UI as above */}
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {/* Submit Buttons */}
                  <div className="flex justify-between items-center pt-4">
                    <div className="flex gap-3 ml-auto">
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setFiles({})
                          setSelectedPageForAction(null)
                        }}
                        className="border-[#2a2435] text-gray-400 hover:bg-[#2a2435]"
                      >
                        Clear
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={
                          isUploading || 
                          !selectedSeries || 
                          (contentAction === 'new-chapter' && (!files.chapters || files.chapters.length === 0)) ||
                          (contentAction === 'manage-chapter' && (!selectedChapter || !files.chapters || files.chapters.length === 0))
                        }
                        className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-8"
                      >
                        {isUploading ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                            Uploading...
                          </div>
                        ) : contentAction === 'manage-chapter' && files.chapters && files.chapters.length > 0 ? (
                          `Add ${files.chapters.length} Pages to Chapter`
                        ) : contentAction === 'manage-chapter' ? (
                          'Select Pages to Add'
                        ) : (
                          'Upload New Chapter'
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </Card>
            ) : (
              // New Series Form placeholder
              <Card className="bg-[#1a1625] border-[#2a2435] p-6">
                <div className="text-center py-12">
                  <Plus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-white text-lg font-medium mb-2">Create New Series</h3>
                  <p className="text-gray-400">New series creation form goes here</p>
                </div>
              </Card>
            )}

            {/* Upload Progress */}
            {uploadStatus !== 'idle' && (
              <Card className="bg-[#1a1625] border-[#2a2435] p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">
                      {uploadStatus === 'uploading' && 'Uploading content...'}
                      {uploadStatus === 'success' && 'Upload complete!'}
                      {uploadStatus === 'error' && 'Upload failed'}
                    </span>
                    <span className={cn(
                      "text-sm",
                      uploadStatus === 'success' ? "text-green-400" :
                      uploadStatus === 'error' ? "text-red-400" :
                      "text-gray-400"
                    )}>
                      {uploadProgress}%
                    </span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                  {uploadStatus === 'success' && (
                    <Alert className="bg-green-500/10 border-green-500/50">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <AlertDescription className="text-gray-300">
                        Your content has been uploaded successfully!
                      </AlertDescription>
                    </Alert>
                  )}
                  {uploadStatus === 'error' && (
                    <Alert className="bg-red-500/10 border-red-500/50">
                      <AlertCircle className="h-4 w-4 text-red-400" />
                      <AlertDescription className="text-gray-300">
                        There was an error uploading your content. Please try again.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="manage" className="space-y-6">
            <Card className="bg-[#1a1625] border-[#2a2435] p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Quick Management</h2>
              <div className="space-y-4">
                {existingSeries.map(series => (
                  <div key={series.id} className="bg-[#0a0a0f] rounded-lg p-4 hover:bg-[#1a1625]/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-white font-medium">{series.title}</h3>
                        <p className="text-gray-400 text-sm">
                          {series.type} • {series.episodes_count || series.chapters_count || 0} {series.type === 'anime' ? 'episodes' : 'chapters'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/content/${series.id}`)}
                          className="border-[#2a2435] text-gray-400 hover:bg-[#2a2435]"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedSeries(series.id)
                            setActiveTab('upload')
                          }}
                          className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6">
            <Card className="bg-[#1a1625] border-[#2a2435] p-6">
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-white text-lg font-medium mb-2">Scheduling Coming Soon</h3>
                <p className="text-gray-400">Schedule your content releases in advance</p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}