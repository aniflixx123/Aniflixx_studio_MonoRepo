'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'

const REGIONS = {
  'North America': ['US', 'CA', 'MX'],
  'Europe': ['GB', 'DE', 'FR', 'ES', 'IT'],
  'Asia': ['JP', 'KR', 'CN', 'IN', 'TH'],
  'South America': ['BR', 'AR', 'CL'],
  'Oceania': ['AU', 'NZ']
}

export default function CreateSeriesPage() {
  const router = useRouter()
  const { orgId } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    // Basic Info
    title: '',
    title_english: '',
    title_japanese: '',
    type: 'anime',
    description: '',
    genres: [] as string[],
    tags: [] as string[],
    
    // Publishing Settings
    release_schedule: 'weekly',
    release_day: 'friday',
    release_time: '12:00',
    release_timezone: 'UTC',
    
    // Regional Settings
    available_worldwide: true,
    selected_regions: [] as string[],
    
    // Monetization
    monetization_type: 'free',
    is_premium: false,
    early_access_hours: 0,
    
    // Content Settings
    content_rating: 'PG-13',
    target_audience: 'shounen'
  })

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // Create series
      const response = await fetch('/api/series', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const data:any = await response.json()
        
        // If regional restrictions were set, save them
        if (!formData.available_worldwide && formData.selected_regions.length > 0) {
          await fetch(`/api/series/${data.id}/regions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              countries: formData.selected_regions,
              is_available: true
            })
          })
        }
        
        router.push(`/content/${data.id}`)
      } else {
        alert('Failed to create series')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to create series')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Create New Series</h1>
      
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {['Basic Info', 'Publishing', 'Regions', 'Monetization'].map((label, index) => (
          <div key={index} className="flex items-center">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center font-medium
              ${step > index + 1 ? 'bg-green-600 text-white' : 
                step === index + 1 ? 'bg-blue-600 text-white' : 
                'bg-gray-200 text-gray-600'}
            `}>
              {step > index + 1 ? '✓' : index + 1}
            </div>
            <span className={`ml-2 ${step === index + 1 ? 'font-medium' : 'text-gray-600'}`}>
              {label}
            </span>
            {index < 3 && <div className="w-20 h-0.5 bg-gray-300 mx-4" />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
            
            <div>
              <label className="block text-sm font-medium mb-2">Series Type *</label>
              <div className="grid grid-cols-4 gap-3">
                {['anime', 'manga', 'webtoon', 'light_novel'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({...formData, type})}
                    className={`p-3 border rounded-lg capitalize ${
                      formData.type === type ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                    }`}
                  >
                    {type === 'light_novel' ? 'Light Novel' : type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full p-2 border rounded"
                placeholder="Series title"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">English Title</label>
                <input
                  type="text"
                  value={formData.title_english}
                  onChange={(e) => setFormData({...formData, title_english: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Japanese Title</label>
                <input
                  type="text"
                  value={formData.title_japanese}
                  onChange={(e) => setFormData({...formData, title_japanese: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full p-2 border rounded"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Content Rating</label>
                <select
                  value={formData.content_rating}
                  onChange={(e) => setFormData({...formData, content_rating: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  <option value="G">G - General</option>
                  <option value="PG">PG - Parental Guidance</option>
                  <option value="PG-13">PG-13</option>
                  <option value="R">R - Restricted</option>
                  <option value="NC-17">NC-17 - Adults Only</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Target Audience</label>
                <select
                  value={formData.target_audience}
                  onChange={(e) => setFormData({...formData, target_audience: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  <option value="kids">Kids</option>
                  <option value="shounen">Shounen</option>
                  <option value="shoujo">Shoujo</option>
                  <option value="seinen">Seinen</option>
                  <option value="josei">Josei</option>
                  <option value="general">General</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!formData.title || !formData.type}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Next: Publishing Settings
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Publishing Settings */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">Publishing Settings</h2>
            
            <div>
              <label className="block text-sm font-medium mb-2">Release Schedule</label>
              <select
                value={formData.release_schedule}
                onChange={(e) => setFormData({...formData, release_schedule: e.target.value})}
                className="w-full p-2 border rounded"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="irregular">Irregular</option>
                <option value="completed">Already Completed</option>
              </select>
            </div>

            {formData.release_schedule === 'weekly' && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Release Day</label>
                  <select
                    value={formData.release_day}
                    onChange={(e) => setFormData({...formData, release_day: e.target.value})}
                    className="w-full p-2 border rounded"
                  >
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                      <option key={day} value={day}>{day.charAt(0).toUpperCase() + day.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Release Time</label>
                  <input
                    type="time"
                    value={formData.release_time}
                    onChange={(e) => setFormData({...formData, release_time: e.target.value})}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Timezone</label>
                  <select
                    value={formData.release_timezone}
                    onChange={(e) => setFormData({...formData, release_timezone: e.target.value})}
                    className="w-full p-2 border rounded"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">EST/EDT</option>
                    <option value="America/Los_Angeles">PST/PDT</option>
                    <option value="Asia/Tokyo">JST</option>
                    <option value="Europe/London">GMT/BST</option>
                  </select>
                </div>
              </div>
            )}

            <div className="bg-blue-50 p-4 rounded">
              <p className="text-sm text-blue-800">
                {formData.release_schedule === 'weekly' ? 
                  `New episodes will be scheduled automatically every ${formData.release_day} at ${formData.release_time} ${formData.release_timezone}` :
                  formData.release_schedule === 'completed' ?
                  'All episodes can be published immediately' :
                  'You\'ll manually schedule each episode release'
                }
              </p>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-2 border rounded hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
              >
                Next: Regional Settings
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Regional Settings */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">Regional Availability</h2>
            
            <div>
              <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  checked={formData.available_worldwide}
                  onChange={() => setFormData({...formData, available_worldwide: true, selected_regions: []})}
                />
                <div>
                  <p className="font-medium">Available Worldwide</p>
                  <p className="text-sm text-gray-600">Content will be available in all regions</p>
                </div>
              </label>
              
              <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 mt-3">
                <input
                  type="radio"
                  checked={!formData.available_worldwide}
                  onChange={() => setFormData({...formData, available_worldwide: false})}
                />
                <div>
                  <p className="font-medium">Select Specific Regions</p>
                  <p className="text-sm text-gray-600">Choose where your content will be available</p>
                </div>
              </label>
            </div>

            {!formData.available_worldwide && (
              <div className="space-y-3 mt-4">
                {Object.entries(REGIONS).map(([region, countries]) => (
                  <div key={region} className="border rounded p-3">
                    <label className="flex items-center gap-2 font-medium mb-2">
                      <input
                        type="checkbox"
                        checked={countries.every(c => formData.selected_regions.includes(c))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              selected_regions: [...new Set([...formData.selected_regions, ...countries])]
                            })
                          } else {
                            setFormData({
                              ...formData,
                              selected_regions: formData.selected_regions.filter(c => !countries.includes(c))
                            })
                          }
                        }}
                      />
                      {region}
                    </label>
                    <div className="grid grid-cols-4 gap-2 ml-6">
                      {countries.map(country => (
                        <label key={country} className="flex items-center gap-1 text-sm">
                          <input
                            type="checkbox"
                            checked={formData.selected_regions.includes(country)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  selected_regions: [...formData.selected_regions, country]
                                })
                              } else {
                                setFormData({
                                  ...formData,
                                  selected_regions: formData.selected_regions.filter(c => c !== country)
                                })
                              }
                            }}
                          />
                          {country}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-2 border rounded hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
              >
                Next: Monetization
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Monetization */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">Monetization Settings</h2>
            
            <div>
              <label className="block text-sm font-medium mb-3">How will this content be monetized?</label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    checked={formData.monetization_type === 'free'}
                    onChange={() => setFormData({...formData, monetization_type: 'free', is_premium: false})}
                  />
                  <div>
                    <p className="font-medium">Free for Everyone</p>
                    <p className="text-sm text-gray-600">Available to all users at no cost</p>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    checked={formData.monetization_type === 'premium'}
                    onChange={() => setFormData({...formData, monetization_type: 'premium', is_premium: true})}
                  />
                  <div>
                    <p className="font-medium">Premium Only</p>
                    <p className="text-sm text-gray-600">Only available to paid subscribers</p>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    checked={formData.monetization_type === 'freemium'}
                    onChange={() => setFormData({...formData, monetization_type: 'freemium'})}
                  />
                  <div>
                    <p className="font-medium">Freemium (Mixed)</p>
                    <p className="text-sm text-gray-600">Some episodes free, some premium</p>
                  </div>
                </label>
              </div>
            </div>

            {formData.monetization_type === 'premium' && (
              <div>
                <label className="block text-sm font-medium mb-2">Early Access (hours)</label>
                <input
                  type="number"
                  value={formData.early_access_hours}
                  onChange={(e) => setFormData({...formData, early_access_hours: parseInt(e.target.value)})}
                  className="w-full p-2 border rounded"
                  min="0"
                  placeholder="0"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Premium users get access this many hours before free users (0 = premium only)
                </p>
              </div>
            )}

            <div className="bg-green-50 p-4 rounded">
              <h3 className="font-medium text-green-900 mb-2">Ready to Create!</h3>
              <p className="text-sm text-green-800">
                Your series will be created with these settings. You can always change them later.
              </p>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(3)}
                className="px-6 py-2 border rounded hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Series'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}