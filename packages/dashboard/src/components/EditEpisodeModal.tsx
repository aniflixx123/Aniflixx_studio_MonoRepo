'use client'

import { useState } from 'react'

type Episode = {
  id: string
  episode_number: number
  title: string
  description?: string
  status: string
  is_premium: boolean
  is_early_access: boolean
  scheduled_at?: string
  available_until?: string
}

interface EditEpisodeModalProps {
  episode: Episode
  onClose: () => void
  onSave: () => void
}

export default function EditEpisodeModal({ episode, onClose, onSave }: EditEpisodeModalProps) {
  const [formData, setFormData] = useState({
    episode_number: episode.episode_number,
    title: episode.title,
    description: episode.description || '',
    status: episode.status,
    is_premium: episode.is_premium || false,
    is_early_access: episode.is_early_access || false,
    scheduled_at: episode.scheduled_at ? episode.scheduled_at.slice(0, 16) : '',
    available_until: episode.available_until ? episode.available_until.slice(0, 16) : ''
  })

  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/episodes/${episode.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        onSave()
      } else {
        alert('Failed to update episode')
      }
    } catch (error) {
      console.error('Update error:', error)
      alert('Failed to update episode')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Edit Episode</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Episode Number *</label>
              <input
                type="number"
                value={formData.episode_number}
                onChange={(e) => setFormData({...formData, episode_number: parseInt(e.target.value)})}
                className="w-full p-2 border rounded"
                required
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full p-2 border rounded"
              >
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>
          </div>

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

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full p-2 border rounded"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Scheduled At</label>
              <input
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) => setFormData({...formData, scheduled_at: e.target.value})}
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Available Until</label>
              <input
                type="datetime-local"
                value={formData.available_until}
                onChange={(e) => setFormData({...formData, available_until: e.target.value})}
                className="w-full p-2 border rounded"
              />
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
                checked={formData.is_early_access}
                onChange={(e) => setFormData({...formData, is_early_access: e.target.checked})}
              />
              <span className="text-sm">Early Access</span>
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