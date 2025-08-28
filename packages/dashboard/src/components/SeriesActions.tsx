'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import EditSeriesModal from './EditSeriesModal'

interface SeriesActionsProps {
  series: any
}

export default function SeriesActions({ series }: SeriesActionsProps) {
  const router = useRouter()
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/series/${series.id}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        router.push('/content')
      } else {
        alert('Failed to delete series')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete series')
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => setShowEditModal(true)}
          className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
        >
          Edit
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Delete
        </button>
      </div>

      {showEditModal && (
        <EditSeriesModal
          series={series}
          onClose={() => setShowEditModal(false)}
          onSave={() => {
            setShowEditModal(false)
            window.location.reload()
          }}
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-xl font-bold mb-4">Delete Series?</h3>
            <p className="mb-6">
              Are you sure you want to delete "{series.title}"? 
              This will also delete all episodes and cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}