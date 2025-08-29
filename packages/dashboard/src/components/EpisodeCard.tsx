'use client'

import { useState } from 'react'
import Link from 'next/link'
import ScheduleModal from './ScheduleModal'
import EditEpisodeModal from './EditEpisodeModal'

interface EpisodeCardProps {
  episode: any
  seriesType: string
}

export default function EpisodeCard({ episode, seriesType }: EpisodeCardProps) {
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showActions, setShowActions] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Delete ${seriesType === 'anime' ? 'episode' : 'chapter'} "${episode.title}"? This cannot be undone.`)) {
      return
    }
    
    try {
      const response = await fetch(`/api/episodes/${episode.id}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        window.location.reload()
      } else {
        alert('Failed to delete episode')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete episode')
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/episodes/${episode.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      })
      
      if (response.ok) {
        window.location.reload()
      }
    } catch (error) {
      console.error('Status change error:', error)
    }
  }

  const getStatusBadge = () => {
    const colors: any = {
      draft: 'bg-gray-100 text-gray-800',
      scheduled: 'bg-yellow-100 text-yellow-800',
      published: 'bg-green-100 text-green-800',
      hidden: 'bg-red-100 text-red-800',
      processing: 'bg-blue-100 text-blue-800',
      archived: 'bg-gray-100 text-gray-500'
    }
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[episode.status] || colors.draft}`}>
        {episode.status}
      </span>
    )
  }

  // Parse video_path to check if it's manga/webtoon
  let pageCount = episode.page_count || 0
  let isChapter = seriesType === 'manga' || seriesType === 'webtoon'
  
  // If page_count not set, try to parse from video_path
  if (!pageCount && episode.video_path && isChapter) {
    try {
      if (episode.video_path.startsWith('[')) {
        // Old format: array of paths
        const pages = JSON.parse(episode.video_path)
        pageCount = pages.length
      } else if (episode.video_path.startsWith('{')) {
        // New format: {pages: [...]}
        const data = JSON.parse(episode.video_path)
        pageCount = data.pages ? data.pages.length : 0
      }
    } catch (e) {
      // Not JSON, probably a video file path
      isChapter = false
    }
  }

  return (
    <>
      <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold">
                {seriesType === 'anime' ? 'Episode' : 'Chapter'} {episode.episode_number}: {episode.title}
              </h3>
              {getStatusBadge()}
              {episode.is_premium && (
                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                  Premium
                </span>
              )}
              {episode.is_early_access && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                  Early Access
                </span>
              )}
            </div>
            
            {episode.description && (
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">{episode.description}</p>
            )}
            
            <div className="text-xs text-gray-500 flex gap-4 flex-wrap">
              {isChapter && pageCount > 0 && <span>{pageCount} pages</span>}
              {episode.duration && <span>{Math.floor(episode.duration / 60)} min</span>}
              {episode.scheduled_at && episode.status === 'scheduled' && (
                <span>Scheduled: {new Date(episode.scheduled_at).toLocaleString()}</span>
              )}
              {episode.published_at && episode.status === 'published' && (
                <span>Published: {new Date(episode.published_at).toLocaleDateString()}</span>
              )}
              {episode.view_count > 0 && <span>{episode.view_count.toLocaleString()} views</span>}
              {episode.file_size && (
                <span>{(episode.file_size / 1024 / 1024).toFixed(1)} MB</span>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            {/* Quick Actions */}
            {episode.status === 'draft' && (
              <button
                onClick={() => handleStatusChange('published')}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                Publish
              </button>
            )}
            
            {episode.status === 'published' && (
              <button
                onClick={() => handleStatusChange('hidden')}
                className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
              >
                Hide
              </button>
            )}

            {/* Actions Menu */}
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
              
              {showActions && (
                <div className="absolute right-0 mt-1 bg-white border rounded-lg shadow-lg py-1 z-10 w-48">
                  {seriesType === 'anime' ? (
                    <a
                      href={`${process.env.NEXT_PUBLIC_API_URL}/api/files/${episode.video_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-4 py-2 hover:bg-gray-100 text-sm"
                      onClick={() => setShowActions(false)}
                    >
                      Watch Episode
                    </a>
                  ) : (
                    <>
                      <Link
                        href={`/content/${episode.series_id}/chapter/${episode.id}`}
                        className="block px-4 py-2 hover:bg-gray-100 text-sm"
                        onClick={() => setShowActions(false)}
                      >
                        Read Chapter
                      </Link>
                      
                      {pageCount > 0 && (
                        <Link
                          href={`/content/${episode.series_id}/chapters/${episode.id}/manage`}
                          className="block px-4 py-2 hover:bg-gray-100 text-sm"
                          onClick={() => setShowActions(false)}
                        >
                          Manage Pages
                        </Link>
                      )}
                    </>
                  )}
                  
                  <button
                    onClick={() => {
                      setShowActions(false)
                      setShowScheduleModal(true)
                    }}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                  >
                    Schedule Release
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowActions(false)
                      setShowEditModal(true)
                    }}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                  >
                    Edit Details
                  </button>
                  
                  {episode.status === 'published' && (
                    <Link
                      href={`/content/${episode.series_id}/analytics/${episode.id}`}
                      className="block px-4 py-2 hover:bg-gray-100 text-sm"
                      onClick={() => setShowActions(false)}
                    >
                      View Analytics
                    </Link>
                  )}
                  
                  <hr className="my-1" />
                  
                  <button
                    onClick={() => {
                      setShowActions(false)
                      handleDelete()
                    }}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-red-600"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showScheduleModal && (
        <ScheduleModal
          episodeId={episode.id}
          episodeTitle={episode.title}
          onClose={() => setShowScheduleModal(false)}
          onSchedule={() => {
            setShowScheduleModal(false)
            window.location.reload()
          }}
        />
      )}

      {showEditModal && (
        <EditEpisodeModal
          episode={episode}
          onClose={() => setShowEditModal(false)}
          onSave={() => {
            setShowEditModal(false)
            window.location.reload()
          }}
        />
      )}
    </>
  )
}