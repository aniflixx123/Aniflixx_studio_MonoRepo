'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type PageData = {
  number: number
  original: string
  mobile?: string
  thumbnail?: string
  size?: number
}

type ChapterInfo = {
  id: string
  series_id: string
  episode_number: number
  title: string
  description?: string
  video_path: string
  status: string
  page_count?: number
}

interface PageParams {
  id: string
  chapterId: string
}

export default function ManageChapterPage({ 
  params 
}: { 
  params: Promise<PageParams>
}) {
  const router = useRouter()
  const [resolvedParams, setResolvedParams] = useState<PageParams | null>(null)
  const [loading, setLoading] = useState(false)
  const [pages, setPages] = useState<PageData[]>([])
  const [chapterInfo, setChapterInfo] = useState<ChapterInfo | null>(null)
  const [uploadingPages, setUploadingPages] = useState(false)
  const [selectedPage, setSelectedPage] = useState<number | null>(null)
  const [draggedPage, setDraggedPage] = useState<number | null>(null)

  // Resolve params
  useEffect(() => {
    params.then(p => setResolvedParams(p))
  }, [params])

  // Fetch chapter data
  useEffect(() => {
    if (resolvedParams?.chapterId) {
      fetchChapterData()
    }
  }, [resolvedParams])

  const fetchChapterData = async () => {
    if (!resolvedParams) return
    
    try {
      const response = await fetch(`/api/episodes/${resolvedParams.chapterId}`)
      if (response.ok) {
        const data:any = await response.json()
        setChapterInfo(data)
        
        // Parse pages - handle both formats
        try {
          const videoPath = data.video_path
          if (typeof videoPath === 'string') {
            if (videoPath.startsWith('{')) {
              // New format: {pages: [...]}
              const chapterData = JSON.parse(videoPath)
              setPages(chapterData.pages || [])
            } else if (videoPath.startsWith('[')) {
              // Old format: ["path1", "path2"]
              const paths = JSON.parse(videoPath)
              setPages(paths.map((path: string, index: number) => ({
                number: index + 1,
                original: path
              })))
            }
          }
        } catch (e) {
          console.error('Error parsing pages:', e)
        }
      }
    } catch (error) {
      console.error('Error fetching chapter:', error)
    }
  }

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, pageNumber: number) => {
    setDraggedPage(pageNumber)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetPageNumber: number) => {
    e.preventDefault()
    
    if (draggedPage === null || draggedPage === targetPageNumber) return
    
    const draggedIndex = pages.findIndex(p => p.number === draggedPage)
    const targetIndex = pages.findIndex(p => p.number === targetPageNumber)
    
    if (draggedIndex === -1 || targetIndex === -1) return
    
    // Reorder pages
    const newPages = [...pages]
    const [movedPage] = newPages.splice(draggedIndex, 1)
    newPages.splice(targetIndex, 0, movedPage)
    
    // Renumber
    const renumberedPages = newPages.map((page, index) => ({
      ...page,
      number: index + 1
    }))
    
    setPages(renumberedPages)
    setDraggedPage(null)
    
    // Save new order
    await savePageOrder(renumberedPages)
  }

  const savePageOrder = async (orderedPages: PageData[]) => {
    if (!resolvedParams) return
    
    try {
      const response = await fetch(`/api/episodes/${resolvedParams.chapterId}/reorder-pages`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pageOrder: orderedPages.map((_, index) => index)
        })
      })
      
      if (!response.ok) {
        console.error('Failed to save page order')
      }
    } catch (error) {
      console.error('Error saving order:', error)
    }
  }

  const replacePage = async (pageNumber: number) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement
      const file = target.files?.[0]
      if (!file || !resolvedParams) return
      
      const formData = new FormData()
      formData.append('page', file)
      
      try {
        const response = await fetch(`/api/episodes/${resolvedParams.chapterId}/pages/${pageNumber}`, {
          method: 'PUT',
          body: formData
        })
        
        if (response.ok) {
          fetchChapterData()
          alert(`Page ${pageNumber} replaced successfully`)
        } else {
          alert('Failed to replace page')
        }
      } catch (error) {
        console.error('Error replacing page:', error)
        alert('Failed to replace page')
      }
    }
    
    input.click()
  }

  const deletePage = async (pageNumber: number) => {
    if (!confirm(`Delete page ${pageNumber}? This will renumber all following pages.`)) return
    if (!resolvedParams) return
    
    try {
      const response = await fetch(`/api/episodes/${resolvedParams.chapterId}/pages/${pageNumber}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        fetchChapterData()
      } else {
        alert('Failed to delete page')
      }
    } catch (error) {
      console.error('Error deleting page:', error)
      alert('Failed to delete page')
    }
  }

  const addPages = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = 'image/*'
    
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement
      const files = target.files ? Array.from(target.files) : []
      if (files.length === 0 || !resolvedParams) return
      
      setUploadingPages(true)
      const formData = new FormData()
      files.forEach((file, i) => {
        formData.append(`page_${i}`, file)
      })
      formData.append('totalPages', files.length.toString())
      
      try {
        const response = await fetch(`/api/upload/chapter/${resolvedParams.chapterId}/pages`, {
          method: 'POST',
          body: formData
        })
        
        if (response.ok) {
          fetchChapterData()
          alert(`Added ${files.length} pages`)
        } else {
          alert('Failed to add pages')
        }
      } catch (error) {
        console.error('Error adding pages:', error)
        alert('Failed to add pages')
      } finally {
        setUploadingPages(false)
      }
    }
    
    input.click()
  }

  if (!resolvedParams || !chapterInfo) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link 
          href={`/content/${resolvedParams.id}`} 
          className="text-blue-600 hover:underline flex items-center gap-2 inline-flex mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Series
        </Link>
        <h1 className="text-3xl font-bold">
          Manage Chapter {chapterInfo.episode_number}
        </h1>
        <p className="text-gray-600 mt-2">
          {chapterInfo.title} • {pages.length} pages
        </p>
      </div>

      {/* Actions Bar */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={addPages}
              disabled={uploadingPages}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploadingPages ? 'Uploading...' : '+ Add Pages'}
            </button>
            
            <Link
              href={`/content/${resolvedParams.id}/chapter/${resolvedParams.chapterId}`}
              className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 transition-colors inline-flex items-center"
            >
              Preview Chapter
            </Link>
          </div>
          
          <div className="text-sm text-gray-600">
            Drag pages to reorder • Click page for options
          </div>
        </div>
      </div>

      {/* Pages Grid */}
      <div className="bg-white rounded-lg shadow p-6">
        {pages.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-6xl mb-4">📚</div>
            <p className="text-lg mb-4">No pages uploaded yet</p>
            <button
              onClick={addPages}
              className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 transition-colors"
            >
              Upload Pages
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {pages.map((page) => (
              <div
                key={page.number}
                draggable
                onDragStart={(e) => handleDragStart(e, page.number)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, page.number)}
                className={`
                  relative group cursor-move border-2 rounded-lg overflow-hidden transition-all
                  ${selectedPage === page.number ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'}
                  ${draggedPage === page.number ? 'opacity-50' : ''}
                `}
                onClick={() => setSelectedPage(selectedPage === page.number ? null : page.number)}
              >
                <div className="aspect-[3/4] bg-gray-100">
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
                <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs font-medium">
                  {page.number}
                </div>
                
                {/* Hover/Selected Actions */}
                {selectedPage === page.number && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                    <div className="flex gap-1 justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          replacePage(page.number)
                        }}
                        className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                      >
                        Replace
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deletePage(page.number)
                        }}
                        className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {/* Add More Pages Button */}
            <div
              onClick={addPages}
              className="aspect-[3/4] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-gray-400 hover:bg-gray-50 cursor-pointer transition-all"
            >
              <div className="text-center">
                <div className="text-3xl mb-2 text-gray-400">+</div>
                <div className="text-xs text-gray-500">Add More</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">How to manage pages:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Drag and drop pages to reorder them</li>
          <li>• Click on a page to see replace/delete options</li>
          <li>• Use "Add Pages" to append more pages to the chapter</li>
          <li>• Changes are saved automatically when you reorder</li>
        </ul>
      </div>
    </div>
  )
}
