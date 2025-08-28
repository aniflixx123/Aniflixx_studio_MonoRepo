'use client'

import { useState } from 'react'

type Series = {
  id: string
  title: string
  title_english?: string
  title_japanese?: string
  description?: string
  status: string
  type: string
  genres?: string[]
  tags?: string[]
  content_rating?: string
  is_premium: boolean
  is_featured: boolean
}

interface EditSeriesModalProps {
  series: Series
  onClose: () => void
  onSave: () => void
}

export default function EditSeriesModal({ series, onClose, onSave }: EditSeriesModalProps) {
  const [formData, setFormData] = useState({
    title: series.title,
    title_english: series.title_english || '',
    title_japanese: series.title_japanese || '',
    description: series.description || '',
    status: series.status,
    genres: series.genres || [],
    tags: series.tags || [],
    content_rating: series.content_rating || 'PG-13',
    is_premium: series.is_premium,
    is_featured: series.is_featured
  })

  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/series/${series.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        onSave()
      } else {
        alert('Failed to update series')
      }
    } catch (error) {
      console.error('Update error:', error)
      alert('Failed to update series')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Edit Series</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">English Title</label>
              <input
                type="text"
                value={formData.title_english}
                onChange={(e) => setFormData({...formData, title_english: e.target.value})}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Japanese Title</label>
              <input
                type="text"
                value={formData.title_japanese}
                onChange={(e) => setFormData({...formData, title_japanese: e.target.value})}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full p-2 border rounded"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full p-2 border rounded"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="completed">Completed</option>
                <option value="hiatus">Hiatus</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Content Rating</label>
              <select
                value={formData.content_rating}
                onChange={(e) => setFormData({...formData, content_rating: e.target.value})}
                className="w-full p-2 border rounded"
              >
                <option value="G">G - General Audiences</option>
                <option value="PG">PG - Parental Guidance</option>
                <option value="PG-13">PG-13 - Parents Strongly Cautioned</option>
                <option value="R">R - Restricted</option>
                <option value="NC-17">NC-17 - Adults Only</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_premium}
                onChange={(e) => setFormData({...formData, is_premium: e.target.checked})}
              />
              <span className="text-sm">Premium Content</span>
            </label>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_featured}
                onChange={(e) => setFormData({...formData, is_featured: e.target.checked})}
              />
              <span className="text-sm">Featured Series</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}