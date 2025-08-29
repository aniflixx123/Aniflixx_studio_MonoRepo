'use client'

import { useState } from 'react'

interface SeriesImageManagerProps {
  seriesId: string
  currentImages: {
    cover_image?: string
    banner_image?: string
    thumbnail_image?: string
    logo_image?: string
  }
  onUpdate: () => void
}

export default function SeriesImageManager({ 
  seriesId, 
  currentImages, 
  onUpdate 
}: SeriesImageManagerProps) {
  const [loading, setLoading] = useState<string | null>(null)
  
  // Get the API URL - fallback to empty string if not defined
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''

  const handleImageUpload = async (imageType: string, file: File) => {
    setLoading(imageType)
    const formData = new FormData()
    formData.append('image', file)

    try {
      const response = await fetch(
        `/api/upload/series/${seriesId}/image/${imageType}`,
        {
          method: 'PUT',
          body: formData
        }
      )

      if (response.ok) {
        alert(`${imageType} image uploaded successfully!`)
        onUpdate() // Refresh parent component
      } else {
        alert(`Failed to upload ${imageType} image`)
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed')
    } finally {
      setLoading(null)
    }
  }

  const handleImageDelete = async (imageType: string) => {
    if (!confirm(`Delete ${imageType} image?`)) return
    
    setLoading(imageType)
    try {
      const response = await fetch(
        `/api/upload/series/${seriesId}/image/${imageType}`,
        {
          method: 'DELETE'
        }
      )

      if (response.ok) {
        alert(`${imageType} image deleted`)
        onUpdate()
      } else {
        alert(`Failed to delete ${imageType} image`)
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Delete failed')
    } finally {
      setLoading(null)
    }
  }

  const getImageUrl = (imagePath: string) => {
    // If no API URL is set, try relative path
    if (!apiUrl) {
      return `/api/files/${imagePath}`
    }
    return `${apiUrl}/api/files/${imagePath}`
  }

  const imageTypes = [
    { key: 'cover', label: 'Cover Image', aspect: 'aspect-[2/3]' },
    { key: 'banner', label: 'Banner Image', aspect: 'aspect-[16/9]' },
    { key: 'thumbnail', label: 'Thumbnail', aspect: 'aspect-square' },
    { key: 'logo', label: 'Logo', aspect: 'aspect-square' }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {imageTypes.map(({ key, label, aspect }) => {
        const imageKey = `${key}_image` as keyof typeof currentImages
        const currentImage = currentImages[imageKey]
        
        return (
          <div key={key} className="space-y-2">
            <label className="text-sm font-medium">{label}</label>
            
            <div className={`${aspect} bg-gray-100 rounded-lg overflow-hidden relative group`}>
              {currentImage ? (
                <>
                  <img
                    src={getImageUrl(currentImage)}
                    alt={label}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to placeholder if image fails to load
                      const target = e.target as HTMLImageElement
                      target.src = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2RkZCIvPjx0ZXh0IHRleHQtYW5jaG9yPSJtaWRkbGUiIHg9IjIwMCIgeT0iMjAwIiBzdHlsZT0iZmlsbDojOTk5O2ZvbnQtZmFtaWx5OkFyaWFsLHNhbnMtc2VyaWY7Zm9udC1zaXplOjI0cHg7Ij5JbWFnZSBOb3QgRm91bmQ8L3RleHQ+PC9zdmc+`
                    }}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <label className="bg-blue-600 text-white px-3 py-1 rounded cursor-pointer hover:bg-blue-700 text-xs">
                      Replace
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleImageUpload(key, file)
                        }}
                        disabled={loading === key}
                      />
                    </label>
                    <button
                      onClick={() => handleImageDelete(key)}
                      disabled={loading === key}
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </>
              ) : (
                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors">
                  <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-xs text-gray-500">Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageUpload(key, file)
                    }}
                    disabled={loading === key}
                  />
                </label>
              )}
              
              {loading === key && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}