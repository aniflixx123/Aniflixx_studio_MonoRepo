'use client'

import { useState, use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const REGIONS = {
  'North America': ['US', 'CA', 'MX'],
  'Europe': ['GB', 'DE', 'FR', 'ES', 'IT', 'NL', 'PL'],
  'Asia': ['JP', 'KR', 'CN', 'IN', 'TH', 'ID', 'MY', 'SG', 'PH'],
  'South America': ['BR', 'AR', 'CL', 'CO', 'PE'],
  'Oceania': ['AU', 'NZ'],
  'Middle East': ['AE', 'SA', 'EG', 'IL']
}

type Series = {
  id: string
  title: string
  type: 'anime' | 'manga' | 'webtoon' | 'light_novel'
  // Default settings from series
  is_premium?: boolean
  release_schedule?: string
  available_regions?: string[]
}

export default function UploadEpisodePage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [series, setSeries] = useState<Series | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  // File upload
  const [file, setFile] = useState<File | null>(null)
  const [files, setFiles] = useState<File[]>([]) // For manga/webtoon pages
  
  // Episode details
  const [formData, setFormData] = useState({
    episodeNumber: '',
    title: '',
    description: '',
    seasonNumber: '1'
  })
  
  // Publishing settings
  const [publishOption, setPublishOption] = useState<'now' | 'schedule' | 'draft'>('draft')
  const [scheduledDate, setScheduledDate] = useState('')
  const [timezone, setTimezone] = useState('UTC')
  
  // Monetization settings
  const [useSeriesDefaults, setUseSeriesDefaults] = useState(true)
  const [isPremium, setIsPremium] = useState(false)
  const [isEarlyAccess, setIsEarlyAccess] = useState(false)
  const [earlyAccessHours, setEarlyAccessHours] = useState(48)
  
  // Regional settings
  const [availableWorldwide, setAvailableWorldwide] = useState(true)
  const [selectedRegions, setSelectedRegions] = useState<string[]>([])
  const [showRegionalSettings, setShowRegionalSettings] = useState(false)

  // Fetch series details
  useEffect(() => {
    fetchSeriesDetails()
  }, [id])

  const fetchSeriesDetails = async () => {
    try {
      const response = await fetch(`/api/series/${id}`)
      if (response.ok) {
        const data:any = await response.json()
        setSeries(data)
        
        // Set defaults from series
        if (data.is_premium !== undefined) {
          setIsPremium(data.is_premium)
        }
        if (data.available_regions) {
          setSelectedRegions(data.available_regions)
          setAvailableWorldwide(false)
        }
      }
    } catch (error) {
      console.error('Error fetching series:', error)
    }
  }

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleImagesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      setFiles(selectedFiles)
    }
  }

  const toggleRegion = (countries: string[]) => {
    setSelectedRegions(prev => {
      const allSelected = countries.every(c => prev.includes(c))
      if (allSelected) {
        return prev.filter(c => !countries.includes(c))
      } else {
        return [...new Set([...prev, ...countries])]
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!series) return
    
    // Validate files
    if (series.type === 'anime' && !file) {
      alert('Please select a video file')
      return
    }
    if ((series.type === 'manga' || series.type === 'webtoon') && files.length === 0) {
      alert('Please select chapter pages')
      return
    }
    
    setLoading(true)
    setUploadProgress(10)

    try {
      let uploadResult:any
      
      // Upload based on content type
      if (series.type === 'anime') {
        const uploadData = new FormData()
        uploadData.append('file', file!)
        uploadData.append('seriesId', id)
        uploadData.append('episodeNumber', formData.episodeNumber)
        uploadData.append('episodeTitle', formData.title)
        uploadData.append('description', formData.description)
        uploadData.append('fileName', file!.name)
        
        // Add publishing settings
        if (publishOption === 'now') {
          uploadData.append('status', 'published')
          uploadData.append('published_at', new Date().toISOString())
        } else if (publishOption === 'schedule') {
          uploadData.append('status', 'scheduled')
          uploadData.append('scheduled_at', scheduledDate)
          uploadData.append('timezone', timezone)
        } else {
          uploadData.append('status', 'draft')
        }
        
        // Add monetization settings
        uploadData.append('is_premium', isPremium.toString())
        uploadData.append('is_early_access', isEarlyAccess.toString())
        if (isEarlyAccess) {
          uploadData.append('early_access_hours', earlyAccessHours.toString())
        }
        
        setUploadProgress(30)
        
        const response = await fetch('/api/upload/chapter', {
          method: 'POST',
          body: uploadData
        })
        
        if (!response.ok) throw new Error('Upload failed')
        uploadResult = await response.json()
        
      } else {
        // Upload manga/webtoon chapter
        const uploadData = new FormData()
files.forEach((file, index) => {
  uploadData.append(`page_${index}`, file)
})
uploadData.append('series_id', id)  // Changed from 'seriesId'
uploadData.append('episode_number', formData.episodeNumber)  // Changed from 'chapterNumber'
uploadData.append('title', formData.title) 
        
        // Add publishing settings
        uploadData.append('status', publishOption === 'now' ? 'published' : 
                         publishOption === 'schedule' ? 'scheduled' : 'draft')
        if (publishOption === 'schedule') {
          uploadData.append('scheduled_at', scheduledDate)
        }
        uploadData.append('is_premium', isPremium.toString())
        
        setUploadProgress(30)
        
        const response = await fetch('/api/upload/chapter', {
          method: 'POST',
          body: uploadData
        })
        
        if (!response.ok) throw new Error('Upload failed')
        uploadResult = await response.json()
      }
      
      setUploadProgress(60)
      
      // Save regional settings if not using defaults
      if (!useSeriesDefaults && !availableWorldwide && selectedRegions.length > 0) {
        await fetch(`/api/episodes/${uploadResult.episodeId}/regions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            countries: selectedRegions,
            is_available: true
          })
        })
      }
      
      setUploadProgress(80)
      
      // If scheduled, add to publish queue
      if (publishOption === 'schedule') {
        await fetch(`/api/episodes/${uploadResult.episodeId}/schedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scheduled_at: scheduledDate,
            timezone: timezone
          })
        })
      }
      
      setUploadProgress(100)
      
      // Success!
      alert(`${series.type === 'anime' ? 'Episode' : 'Chapter'} uploaded successfully!`)
      router.push(`/content/${id}`)
      
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed!')
    } finally {
      setLoading(false)
      setUploadProgress(0)
    }
  }

  if (!series) {
    return <div className="p-8">Loading series information...</div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href={`/content/${id}`} className="text-blue-600 hover:underline">
          ← Back to {series.title}
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-2">
        Upload {series.type === 'anime' ? 'Episode' : 'Chapter'}
      </h1>
      <p className="text-gray-600 mb-6">
        Series: <span className="font-semibold">{series.title}</span> • 
        Type: <span className="capitalize font-semibold ml-1">{series.type}</span>
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Details Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Episode Details</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                {series.type === 'anime' ? 'Episode' : 'Chapter'} Number *
              </label>
              <input
                type="number"
                required
                value={formData.episodeNumber}
                onChange={(e) => setFormData({...formData, episodeNumber: e.target.value})}
                className="w-full p-2 border rounded"
                placeholder="1"
                min="1"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                {series.type === 'anime' ? 'Episode' : 'Chapter'} Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full p-2 border rounded"
                placeholder="Enter title"
              />
            </div>
          </div>

          {series.type === 'anime' && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Season</label>
              <input
                type="number"
                value={formData.seasonNumber}
                onChange={(e) => setFormData({...formData, seasonNumber: e.target.value})}
                className="w-full p-2 border rounded"
                placeholder="1"
                min="1"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full p-2 border rounded"
              rows={3}
              placeholder={`${series.type === 'anime' ? 'Episode' : 'Chapter'} synopsis...`}
            />
          </div>
        </div>

        {/* File Upload Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            {series.type === 'anime' ? 'Video File' : 'Chapter Pages'}
          </h2>
          
          {series.type === 'anime' ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoSelect}
                className="hidden"
                id="file-upload"
                disabled={loading}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="text-gray-600">
                  {file ? (
                    <div>
                      <svg className="mx-auto h-12 w-12 text-green-600 mb-3" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-lg text-green-600 font-medium">Video selected</p>
                      <p className="text-sm font-medium mt-2">{file.name}</p>
                      <p className="text-xs text-gray-500">Size: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      <p className="text-xs text-blue-600 mt-2">Click to change file</p>
                    </div>
                  ) : (
                    <>
                      <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-lg mb-2">Click to select video file</p>
                      <p className="text-sm text-gray-500">MP4, WebM or MOV (Max 5GB)</p>
                    </>
                  )}
                </div>
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImagesSelect}
                  className="hidden"
                  id="files-upload"
                  disabled={loading}
                />
                <label htmlFor="files-upload" className="cursor-pointer">
                  <div className="text-gray-600">
                    {files.length > 0 ? (
                      <div>
                        <svg className="mx-auto h-12 w-12 text-green-600 mb-3" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-lg text-green-600 font-medium">{files.length} pages selected</p>
                        <p className="text-sm text-gray-600 mt-2">Click to change selection</p>
                      </div>
                    ) : (
                      <>
                        <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-lg mb-2">Click to select chapter pages</p>
                        <p className="text-sm text-gray-500">Select all pages in order (PNG, JPG, WebP)</p>
                        <p className="text-xs text-gray-400 mt-1">You can select multiple files at once</p>
                      </>
                    )}
                  </div>
                </label>
              </div>

              {/* Preview selected pages */}
              {files.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Page Order (drag to reorder):</p>
                  <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded">
                    {files.map((file, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Page ${index + 1}`}
                          className="w-full h-20 object-cover rounded border"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                          <span className="text-white text-xs font-medium">{index + 1}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Publishing Settings Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Publishing Settings</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-3">When should this be published?</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="publish"
                    checked={publishOption === 'now'}
                    onChange={() => setPublishOption('now')}
                  />
                  <div>
                    <p className="font-medium">Publish immediately</p>
                    <p className="text-sm text-gray-600">Make it available right after upload</p>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="publish"
                    checked={publishOption === 'schedule'}
                    onChange={() => setPublishOption('schedule')}
                  />
                  <div>
                    <p className="font-medium">Schedule for later</p>
                    <p className="text-sm text-gray-600">Set a specific date and time for release</p>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="publish"
                    checked={publishOption === 'draft'}
                    onChange={() => setPublishOption('draft')}
                  />
                  <div>
                    <p className="font-medium">Save as draft</p>
                    <p className="text-sm text-gray-600">Upload now, publish manually later</p>
                  </div>
                </label>
              </div>
            </div>

            {publishOption === 'schedule' && (
              <div className="ml-10 p-4 bg-blue-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Release Date & Time</label>
                    <input
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full p-2 border rounded"
                      min={new Date().toISOString().slice(0, 16)}
                      required={publishOption === 'schedule'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Timezone</label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full p-2 border rounded"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="Europe/London">London</option>
                      <option value="Asia/Tokyo">Tokyo</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Monetization Settings Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Monetization Settings</h2>
          
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={useSeriesDefaults}
                onChange={(e) => setUseSeriesDefaults(e.target.checked)}
              />
              <div>
                <p className="font-medium">Use series default settings</p>
                <p className="text-sm text-gray-600">
                  Inherit monetization settings from the series configuration
                </p>
              </div>
            </label>

            {!useSeriesDefaults && (
              <div className="ml-7 space-y-3 p-4 bg-gray-50 rounded-lg">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isPremium}
                    onChange={(e) => setIsPremium(e.target.checked)}
                  />
                  <span>Premium content (requires subscription)</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isEarlyAccess}
                    onChange={(e) => setIsEarlyAccess(e.target.checked)}
                  />
                  <span>Early access for premium users</span>
                </label>
                
                {isEarlyAccess && (
                  <div className="ml-6">
                    <label className="block text-sm font-medium mb-1">Early access period (hours)</label>
                    <input
                      type="number"
                      value={earlyAccessHours}
                      onChange={(e) => setEarlyAccessHours(parseInt(e.target.value))}
                      className="w-32 p-2 border rounded"
                      min="1"
                      max="168"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Premium users get access {earlyAccessHours} hours before free users
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Regional Settings Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Regional Availability</h2>
          
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={!availableWorldwide}
                  onChange={(e) => {
                    setAvailableWorldwide(!e.target.checked)
                    setShowRegionalSettings(e.target.checked)
                  }}
                />
                <div>
                  <p className="font-medium">Restrict to specific regions</p>
                  <p className="text-sm text-gray-600">
                    {availableWorldwide 
                      ? 'Currently available worldwide'
                      : `Available in ${selectedRegions.length} countries`}
                  </p>
                </div>
              </label>
            </div>

            {showRegionalSettings && !availableWorldwide && (
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                {Object.entries(REGIONS).map(([region, countries]) => {
                  const allSelected = countries.every(c => selectedRegions.includes(c))
                  const someSelected = countries.some(c => selectedRegions.includes(c))
                  
                  return (
                    <div key={region} className="border bg-white rounded p-3">
                      <label className="flex items-center gap-2 font-medium mb-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={input => {
                            if (input) input.indeterminate = someSelected && !allSelected
                          }}
                          onChange={() => toggleRegion(countries)}
                        />
                        <span>{region}</span>
                        <span className="text-sm font-normal text-gray-500 ml-auto">
                          {countries.filter(c => selectedRegions.includes(c)).length}/{countries.length}
                        </span>
                      </label>
                      <div className="grid grid-cols-5 gap-2 ml-6">
                        {countries.map(country => (
                          <label key={country} className="flex items-center gap-1 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedRegions.includes(country)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRegions([...selectedRegions, country])
                                } else {
                                  setSelectedRegions(selectedRegions.filter(c => c !== country))
                                }
                              }}
                            />
                            <span>{country}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
                
                <div className="text-sm text-gray-600 mt-2">
                  Total: {selectedRegions.length} countries selected
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Upload Progress */}
        {loading && (
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm font-medium mb-2">
              Uploading {series.type === 'anime' ? 'episode' : 'chapter'}...
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {uploadProgress < 30 && 'Preparing upload...'}
              {uploadProgress >= 30 && uploadProgress < 60 && 'Uploading files...'}
              {uploadProgress >= 60 && uploadProgress < 80 && 'Saving settings...'}
              {uploadProgress >= 80 && uploadProgress < 100 && 'Finalizing...'}
              {uploadProgress === 100 && 'Complete!'}
            </p>
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => router.push(`/content/${id}`)}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={
              loading || 
              !formData.episodeNumber || 
              !formData.title ||
              (series.type === 'anime' ? !file : files.length === 0) ||
              (publishOption === 'schedule' && !scheduledDate)
            }
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Uploading...' : `Upload ${series.type === 'anime' ? 'Episode' : 'Chapter'}`}
          </button>
        </div>
      </form>
    </div>
  )
}