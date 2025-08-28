'use client'

import { useState } from 'react'

interface ScheduleModalProps {
  episodeId: string
  episodeTitle: string
  onClose: () => void
  onSchedule: () => void
}

export default function ScheduleModal({ episodeId, episodeTitle, onClose, onSchedule }: ScheduleModalProps) {
  const [scheduledAt, setScheduledAt] = useState('')
  const [timezone, setTimezone] = useState('UTC')
  const [loading, setLoading] = useState(false)

  const timezones = [
    'UTC',
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Seoul',
    'Australia/Sydney'
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/episodes/${episodeId}/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheduled_at: scheduledAt,
          timezone
        })
      })

      if (response.ok) {
        onSchedule()
      } else {
        alert('Failed to schedule episode')
      }
    } catch (error) {
      console.error('Schedule error:', error)
      alert('Failed to schedule')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Schedule Episode</h2>
        <p className="text-gray-600 mb-4">Scheduling: {episodeTitle}</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Release Date & Time *</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full p-2 border rounded"
              required
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full p-2 border rounded"
            >
              {timezones.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>

          <div className="bg-blue-50 p-3 rounded text-sm">
            <p className="font-medium">Note:</p>
            <p>The episode will automatically be published at the scheduled time.</p>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || !scheduledAt}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Scheduling...' : 'Schedule'}
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