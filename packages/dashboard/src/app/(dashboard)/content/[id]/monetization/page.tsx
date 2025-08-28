'use client'

import { useState, use } from 'react'
import Link from 'next/link'

export default function MonetizationPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = use(params)
  const [settings, setSettings] = useState({
    monetization_type: 'premium',
    is_free: false,
    is_premium: true,
    early_access_hours: 0,
    preview_duration: 0
  })
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/monetization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          series_id: id,
          ...settings
        })
      })

      if (response.ok) {
        alert('Monetization settings saved!')
      }
    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href={`/content/${id}`} className="text-blue-600 hover:underline">
          ← Back to Series
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold mb-6">Monetization Settings</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Monetization Type</label>
            <select
              value={settings.monetization_type}
              onChange={(e) => setSettings({...settings, monetization_type: e.target.value})}
              className="w-full p-2 border rounded"
            >
              <option value="free">Free</option>
              <option value="premium">Premium Only</option>
              <option value="freemium">Freemium (Free with Ads)</option>
              <option value="pay_per_view">Pay Per View</option>
            </select>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.is_premium}
                onChange={(e) => setSettings({...settings, is_premium: e.target.checked})}
              />
              <span>Premium Content</span>
            </label>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.is_free}
                onChange={(e) => setSettings({...settings, is_free: e.target.checked})}
              />
              <span>Free Access Available</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Early Access (Premium users get access X hours early)
            </label>
            <input
              type="number"
              value={settings.early_access_hours}
              onChange={(e) => setSettings({...settings, early_access_hours: parseInt(e.target.value)})}
              className="w-full p-2 border rounded"
              min="0"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Preview Duration (seconds for free users)
            </label>
            <input
              type="number"
              value={settings.preview_duration}
              onChange={(e) => setSettings({...settings, preview_duration: parseInt(e.target.value)})}
              className="w-full p-2 border rounded"
              min="0"
              placeholder="0"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}