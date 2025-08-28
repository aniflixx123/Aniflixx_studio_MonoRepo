'use client'

import { useState, useEffect } from 'react'

const REGIONS = {
  'North America': ['US', 'CA', 'MX'],
  'Europe': ['GB', 'DE', 'FR', 'ES', 'IT', 'NL', 'PL'],
  'Asia': ['JP', 'KR', 'CN', 'IN', 'TH', 'ID', 'MY', 'SG', 'PH'],
  'South America': ['BR', 'AR', 'CL', 'CO', 'PE'],
  'Oceania': ['AU', 'NZ'],
  'Middle East': ['AE', 'SA', 'EG', 'IL']
}

interface RegionalSettingsProps {
  seriesId: string
}

export default function RegionalSettings({ seriesId }: RegionalSettingsProps) {
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [availableFrom, setAvailableFrom] = useState('')
  const [availableUntil, setAvailableUntil] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchRegions()
  }, [seriesId])

  const fetchRegions = async () => {
    try {
      const response = await fetch(`/api/series/${seriesId}/regions`)
      if (response.ok) {
        const data:any = await response.json()
        const countries = data.regions.map((r: any) => r.country_code)
        setSelectedCountries(countries)
      }
    } catch (error) {
      console.error('Error fetching regions:', error)
    }
  }

  const toggleRegion = (countries: string[]) => {
    setSelectedCountries(prev => {
      const allSelected = countries.every(c => prev.includes(c))
      if (allSelected) {
        return prev.filter(c => !countries.includes(c))
      } else {
        return [...new Set([...prev, ...countries])]
      }
    })
  }

  const toggleCountry = (country: string) => {
    setSelectedCountries(prev => 
      prev.includes(country) 
        ? prev.filter(c => c !== country)
        : [...prev, country]
    )
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/series/${seriesId}/regions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          countries: selectedCountries,
          available_from: availableFrom || null,
          available_until: availableUntil || null,
          is_available: true
        })
      })

      if (response.ok) {
        alert('Regional settings saved!')
      } else {
        alert('Failed to save regional settings')
      }
    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-semibold mb-4">Regional Availability</h3>
      
      <div className="space-y-4">
        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Available From</label>
            <input
              type="datetime-local"
              value={availableFrom}
              onChange={(e) => setAvailableFrom(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Available Until</label>
            <input
              type="datetime-local"
              value={availableUntil}
              onChange={(e) => setAvailableUntil(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>

        {/* Region Selection */}
        <div className="space-y-3">
          {Object.entries(REGIONS).map(([region, countries]) => {
            const allSelected = countries.every(c => selectedCountries.includes(c))
            const someSelected = countries.some(c => selectedCountries.includes(c))
            
            return (
              <div key={region} className="border rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={input => {
                        if (input) input.indeterminate = someSelected && !allSelected
                      }}
                      onChange={() => toggleRegion(countries)}
                    />
                    <span className="font-medium">{region}</span>
                  </label>
                  <span className="text-sm text-gray-500">
                    {countries.filter(c => selectedCountries.includes(c)).length}/{countries.length} selected
                  </span>
                </div>
                
                <div className="grid grid-cols-4 gap-2 ml-6">
                  {countries.map(country => (
                    <label key={country} className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedCountries.includes(country)}
                        onChange={() => toggleCountry(country)}
                      />
                      <span>{country}</span>
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-gray-600">
            {selectedCountries.length} countries selected
          </div>
          <button
            onClick={handleSave}
            disabled={loading || selectedCountries.length === 0}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Regional Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}