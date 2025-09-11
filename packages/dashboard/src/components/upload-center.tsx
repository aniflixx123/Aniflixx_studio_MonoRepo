// components/upload-center.tsx
'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { 
  Upload,
  Plus,
  Film,
  BookOpen,
  Smartphone,
  Book,
  FileVideo,
  AlertCircle,
  CheckCircle,
  Loader2,
  FileUp,
  Sparkles,
  Calendar,
  PlayCircle,
  FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Episode = {
  id: string
  series_id: string
  episode_number: number
  title: string
  video_url?: string
  thumbnail_url?: string
  created_at: string
}

type Chapter = {
  id: string
  series_id: string
  chapter_number: number
  title: string
  pages?: string[]
  created_at: string
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
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  // Series form state
  const [formData, setFormData] = useState({
    title: '',
    titleEnglish: '',
    type: 'anime',
    description: '',
    genres: [] as string[],
    tags: '',
    isPremium: false,
    isFeatured: false
  })
  
  // Episode/Chapter state
  const [selectedSeries, setSelectedSeries] = useState('')
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

  // Get selected series data with episodes/chapters
  const selectedSeriesData = existingSeries.find(s => s.id === selectedSeries)
  const isAnime = selectedSeriesData?.type === 'anime'
  const currentContent = isAnime ? selectedSeriesData?.episodes : selectedSeriesData?.chapters
  
  // Calculate next episode/chapter number
  useEffect(() => {
    if (selectedSeriesData) {
      const nextNumber = isAnime 
        ? (selectedSeriesData.episodes_count || 0) + 1
        : (selectedSeriesData.chapters_count || 0) + 1
      setEpisodeData(prev => ({ ...prev, number: nextNumber.toString() }))
    }
  }, [selectedSeries, selectedSeriesData, isAnime])

  // Calculate real stats (NO FAKE DATA)
  const totalEpisodes = existingSeries.reduce((acc, s) => acc + (s.episodes_count || 0), 0)
  const totalChapters = existingSeries.reduce((acc, s) => acc + (s.chapters_count || 0), 0)

  // Drag and drop handlers
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

  async function handleSeriesSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsUploading(true)
    setUploadProgress(0)
    
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 10
      })
    }, 200)
    
    try {
      const formDataToSend = new FormData()
      formDataToSend.append('title', formData.title)
      formDataToSend.append('title_english', formData.titleEnglish)
      formDataToSend.append('type', formData.type)
      formDataToSend.append('description', formData.description)
      formDataToSend.append('genres', JSON.stringify(formData.genres))
      formDataToSend.append('tags', formData.tags)
      formDataToSend.append('is_premium', formData.isPremium.toString())
      formDataToSend.append('is_featured', formData.isFeatured.toString())
      formDataToSend.append('status', 'draft')
      
      if (files.cover) {
        formDataToSend.append('cover_image', files.cover)
      }
      
      const response = await fetch('/api/series', {
        method: 'POST',
        headers: { 'X-Org-Id': orgId },
        body: formDataToSend
      })
      
      if (response.ok) {
        setUploadProgress(100)
        setTimeout(() => {
          router.push('/content')
        }, 1000)
      }
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      clearInterval(progressInterval)
      setIsUploading(false)
    }
  }
  
  async function handleEpisodeSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSeries) return
    
    setIsUploading(true)
    setUploadProgress(0)
    
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => prev >= 90 ? 90 : prev + 10)
    }, 300)
    
    try {
      const formDataToSend = new FormData()
      formDataToSend.append('title', episodeData.title)
      formDataToSend.append(isAnime ? 'episode_number' : 'chapter_number', episodeData.number)
      formDataToSend.append('description', episodeData.description)
      formDataToSend.append('release_date', episodeData.releaseDate)
      
      const endpoint = isAnime 
        ? `/api/series/${selectedSeries}/episodes`
        : `/api/series/${selectedSeries}/chapters`
      
      if (files.video) {
        formDataToSend.append('video_file', files.video)
      }
      if (files.chapters) {
        files.chapters.forEach(file => {
          formDataToSend.append('pages', file)
        })
      }
      if (files.thumbnail) {
        formDataToSend.append('thumbnail', files.thumbnail)
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'X-Org-Id': orgId },
        body: formDataToSend
      })
      
      if (response.ok) {
        setUploadProgress(100)
        setTimeout(() => {
          router.push(`/content/${selectedSeries}`)
        }, 1000)
      }
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      clearInterval(progressInterval)
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-white mb-2">Upload Center</h1>
          <p className="text-gray-400">Upload and manage your content</p>
        </div>

        {/* Real Stats (NO FAKE DATA) */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="bg-[#1a1625] border-[#2a2435] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Total Series</p>
                <p className="text-2xl font-semibold text-white">{existingSeries.length}</p>
              </div>
              <Film className="h-8 w-8 text-purple-500" />
            </div>
          </Card>
          <Card className="bg-[#1a1625] border-[#2a2435] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Total Episodes</p>
                <p className="text-2xl font-semibold text-white">{totalEpisodes}</p>
              </div>
              <PlayCircle className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          <Card className="bg-[#1a1625] border-[#2a2435] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Total Chapters</p>
                <p className="text-2xl font-semibold text-white">{totalChapters}</p>
              </div>
              <FileText className="h-8 w-8 text-green-500" />
            </div>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-[#1a1625] border border-[#2a2435] mb-6">
            <TabsTrigger value="upload">Upload Content</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            {/* Upload Type Selection */}
            <div className="grid grid-cols-2 gap-4">
              <Card 
                className={cn(
                  "bg-[#1a1625] border-2 p-6 cursor-pointer transition-all",
                  uploadType === 'existing' ? "border-purple-500" : "border-[#2a2435] hover:border-[#3a3445]"
                )}
                onClick={() => setUploadType('existing')}
              >
                <Upload className="h-8 w-8 text-purple-500 mb-3" />
                <h3 className="text-white font-semibold mb-1">Add to Existing Series</h3>
                <p className="text-gray-400 text-sm">Upload episodes or chapters to current series</p>
              </Card>
              
              <Card 
                className={cn(
                  "bg-[#1a1625] border-2 p-6 cursor-pointer transition-all",
                  uploadType === 'new' ? "border-purple-500" : "border-[#2a2435] hover:border-[#3a3445]"
                )}
                onClick={() => setUploadType('new')}
              >
                <Plus className="h-8 w-8 text-green-500 mb-3" />
                <h3 className="text-white font-semibold mb-1">Create New Series</h3>
                <p className="text-gray-400 text-sm">Start a new anime, manga, or webtoon series</p>
              </Card>
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <Alert className="bg-purple-500/10 border-purple-500/50">
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription className="text-white">
                  Uploading... {uploadProgress}%
                  <Progress value={uploadProgress} className="mt-2" />
                </AlertDescription>
              </Alert>
            )}

            {/* Existing Series Upload */}
            {uploadType === 'existing' && (
              <Card className="bg-[#1a1625] border-[#2a2435]">
                <form onSubmit={handleEpisodeSubmit} className="p-6 space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-white mb-2">Select Series</Label>
                      <Select value={selectedSeries} onValueChange={setSelectedSeries}>
                        <SelectTrigger className="bg-[#0a0a0f] border-[#2a2435] text-white">
                          <SelectValue placeholder="Choose a series to add content" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1625] border-[#2a2435]">
                          {existingSeries.map((series) => (
                            <SelectItem key={series.id} value={series.id} className="text-white">
                              <div className="flex items-center justify-between w-full">
                                <span>{series.title}</span>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {series.type}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {series.type === 'anime' 
                                      ? `${series.episodes_count || 0} EP`
                                      : `${series.chapters_count || 0} CH`}
                                  </Badge>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedSeriesData && (
                      <>
                        {/* Show Current Episodes/Chapters */}
                        {currentContent && currentContent.length > 0 && (
                          <div className="bg-[#0a0a0f] rounded-lg p-4">
                            <p className="text-gray-400 text-sm mb-3">
                              Current {isAnime ? 'Episodes' : 'Chapters'}:
                            </p>
                            <ScrollArea className="h-32">
                              <div className="space-y-2">
                                {currentContent.map((item: Episode | Chapter) => (
                                  <div key={item.id} className="flex items-center justify-between text-sm">
                                    <span className="text-white">
                                      #{(item as any).episode_number || (item as any).chapter_number} - {item.title}
                                    </span>
                                    <span className="text-gray-500 text-xs">
                                      {new Date(item.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-white">
                              {isAnime ? 'Episode' : 'Chapter'} Number
                            </Label>
                            <Input
                              type="number"
                              value={episodeData.number}
                              onChange={(e) => setEpisodeData({...episodeData, number: e.target.value})}
                              className="bg-[#0a0a0f] border-[#2a2435] text-white"
                              placeholder="Next number"
                              required
                            />
                          </div>
                          <div>
                            <Label className="text-white">Title</Label>
                            <Input
                              value={episodeData.title}
                              onChange={(e) => setEpisodeData({...episodeData, title: e.target.value})}
                              className="bg-[#0a0a0f] border-[#2a2435] text-white"
                              placeholder={`${isAnime ? 'Episode' : 'Chapter'} title`}
                              required
                            />
                          </div>
                        </div>

                        {/* File Upload Area */}
                        <div
                          className={cn(
                            "border-2 border-dashed rounded-lg p-8 text-center transition-all",
                            dragActive ? "border-purple-500 bg-purple-500/10" : "border-[#2a2435]"
                          )}
                          onDragEnter={handleDrag}
                          onDragLeave={handleDrag}
                          onDragOver={handleDrag}
                          onDrop={(e) => handleDrop(e, isAnime ? 'video' : 'chapters')}
                        >
                          <FileUp className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                          <p className="text-white font-medium mb-2">
                            Drag & drop your {isAnime ? 'video file' : 'chapter images'} here
                          </p>
                          <p className="text-gray-400 text-sm mb-4">
                            {isAnime ? 'MP4, MKV, WEBM (Max 2GB)' : 'JPG, PNG, WEBP (Multiple files)'}
                          </p>
                          <Input
                            type="file"
                            accept={isAnime ? "video/*" : "image/*"}
                            multiple={!isAnime}
                            onChange={(e) => {
                              const fileList = Array.from(e.target.files || [])
                              if (isAnime) {
                                setFiles(prev => ({ ...prev, video: fileList[0] }))
                              } else {
                                setFiles(prev => ({ ...prev, chapters: fileList }))
                              }
                            }}
                            className="hidden"
                            id="file-upload"
                          />
                          <Label htmlFor="file-upload" className="cursor-pointer">
                            <Button type="button" variant="outline" className="bg-purple-600 hover:bg-purple-700 text-white border-0">
                              Browse Files
                            </Button>
                          </Label>
                          
                          {(files.video || files.chapters) && (
                            <div className="mt-4 text-sm text-green-400">
                              <CheckCircle className="inline h-4 w-4 mr-1" />
                              {files.video ? files.video.name : `${files.chapters?.length} files selected`}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button 
                      type="submit" 
                      disabled={isUploading || !selectedSeries || (!files.video && !files.chapters)}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* New Series Form */}
            {uploadType === 'new' && (
              <Card className="bg-[#1a1625] border-[#2a2435]">
                <form onSubmit={handleSeriesSubmit} className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white">Original Title</Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        className="bg-[#0a0a0f] border-[#2a2435] text-white"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-white">English Title</Label>
                      <Input
                        value={formData.titleEnglish}
                        onChange={(e) => setFormData({...formData, titleEnglish: e.target.value})}
                        className="bg-[#0a0a0f] border-[#2a2435] text-white"
                      />
                    </div>
                  </div>

                  {/* Content Type */}
                  <div>
                    <Label className="text-white mb-3">Content Type</Label>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { value: 'anime', label: 'Anime', icon: Film },
                        { value: 'manga', label: 'Manga', icon: BookOpen },
                        { value: 'webtoon', label: 'Webtoon', icon: Smartphone },
                        { value: 'light_novel', label: 'Light Novel', icon: Book }
                      ].map(type => (
                        <Card
                          key={type.value}
                          className={cn(
                            "p-4 cursor-pointer transition-all",
                            formData.type === type.value
                              ? "bg-purple-500/20 border-purple-500"
                              : "bg-[#0a0a0f] border-[#2a2435] hover:border-[#3a3445]"
                          )}
                          onClick={() => setFormData({...formData, type: type.value})}
                        >
                          <type.icon className="h-6 w-6 text-purple-400 mb-2" />
                          <p className="text-white text-sm">{type.label}</p>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button 
                      type="submit" 
                      disabled={isUploading || !formData.title}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Create Series
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}