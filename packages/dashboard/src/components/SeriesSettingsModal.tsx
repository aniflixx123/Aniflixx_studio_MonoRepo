'use client'

import { useState } from 'react'

interface SeriesSettingsModalProps {
  series: any
  onClose: () => void
  onSave: () => void
}

const REGIONS = {
  'North America': ['US', 'CA', 'MX'],
  'Europe': ['GB', 'DE', 'FR', 'ES', 'IT'],
  'Asia': ['JP', 'KR', 'CN', 'IN', 'TH'],
  'South America': ['BR', 'AR', 'CL'],
  'Oceania': ['AU', 'NZ']
}

export default function SeriesSettingsModal({ series, onClose, onSave }: SeriesSettingsModalProps) {
  const [activeTab, setActiveTab] = useState('publishing')
  const [settings, setSettings] = useState({
    // Publishing
    release_schedule: series.release_schedule || 'weekly',
    release_day: series.release_day || 'friday',
    release_time: series.release_time || '12:00',
    release_timezone: series.release_timezone || 'UTC',
    
    // Monetization
    is_premium: series.is_premium || false,
    early_access_hours: series.early_access_hours || 0,
    
    // Regional
    available_worldwide: series.available_worldwide !== false,
    selected_regions: series.selected_regions || []
  })
  
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    try {
      // Update series settings
      const response = await fetch(`/api/series/${series.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      
      if (response.ok) {
        // Update regional settings
        if (!settings.available_worldwide) {
          await fetch(`/api/series/${series.id}/regions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              countries: settings.selected_regions,
              is_available: true
            })
          })
        }
        
        onSave()
      }
    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold">Series Settings</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex border-b">
          {['publishing', 'monetization', 'regional'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 capitalize font-medium ${
                activeTab === tab 
                  ? 'border-b-2 border-blue-600 text-blue-600' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {activeTab === 'publishing' && (
            <div className="space-y-4">
              <h3 className="font-semibold mb-3">Default Publishing Schedule</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Release Pattern</label>
                <select
                  value={settings.release_schedule}
                  onChange={(e) => setSettings({...settings, release_schedule: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="irregular">Irregular</option>
                </select>
              </div>

              {settings.release_schedule === 'weekly' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Release Day</label>
                    <select
                      value={settings.release_day}
                      onChange={(e) => setSettings({...settings, release_day: e.target.value})}
                      className="w-full p-2 border rounded"
                    >
                      {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                        <option key={day} value={day}>{day.charAt(0).toUpperCase() + day.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Release Time</label>
                      <input
                        type="time"
                        value={settings.release_time}
                        onChange={(e) => setSettings({...settings, release_time: e.target.value})}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Timezone</label>
                      <select
                        value={settings.release_timezone}
                        onChange={(e) => setSettings({...settings, release_timezone: e.target.value})}
                        className="w-full p-2 border rounded"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                        <option value="Asia/Tokyo">Tokyo</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'monetization' && (
            <div className="space-y-4">
              <h3 className="font-semibold mb-3">Default Monetization</h3>
              
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.is_premium}
                  onChange={(e) => setSettings({...settings, is_premium: e.target.checked})}
                />
                <div>
                  <p className="font-medium">Premium Content</p>
                  <p className="text-sm text-gray-600">All episodes require subscription by default</p>
                </div>
              </label>

              {settings.is_premium && (
                <div>
                  <label className="block text-sm font-medium mb-2">Early Access Period (hours)</label>
                  <input
                    type="number"
                    value={settings.early_access_hours}
                    onChange={(e) => setSettings({...settings, early_access_hours: parseInt(e.target.value)})}
                    className="w-32 p-2 border rounded"
                    min="0"
                    max="168"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    0 = Premium only, 1-168 = Hours before free users get access
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'regional' && (
            <div className="space-y-4">
              <h3 className="font-semibold mb-3">Default Regional Availability</h3>
              
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    checked={settings.available_worldwide}
                    onChange={() => setSettings({...settings, available_worldwide: true})}
                  />
                  <div>
                    <p className="font-medium">Available Worldwide</p>
                    <p className="text-sm text-gray-600">No regional restrictions</p>
                  </div>
                </label>
                
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    checked={!settings.available_worldwide}
                    onChange={() => setSettings({...settings, available_worldwide: false})}
                  />
                  <div>
                    <p className="font-medium">Specific Regions Only</p>
                    <p className="text-sm text-gray-600">Choose where content is available</p>
                  </div>
                </label>
              </div>

              {!settings.available_worldwide && (
                <div className="space-y-2 mt-4">
                  {Object.entries(REGIONS).map(([region, countries]) => (
                    <div key={region} className="border rounded p-3">
                      <label className="flex items-center gap-2 font-medium">
                        <input
                          type="checkbox"
                          checked={countries.every(c => settings.selected_regions.includes(c))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSettings({
                                ...settings,
                                selected_regions: [...new Set([...settings.selected_regions, ...countries])]
                              })
                            } else {
                              setSettings({
                                ...settings,
                                selected_regions: settings.selected_regions.filter((c:any )=> !countries.includes(c))
                              })
                            }
                          }}
                        />
                        {region}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-6 py-2 border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
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