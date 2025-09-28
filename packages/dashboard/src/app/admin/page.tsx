'use client'

import { useAuth } from '@clerk/nextjs'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const { userId, isLoaded } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [studioName, setStudioName] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  // Replace this with your actual Clerk user ID
  // To get it: Go to Clerk Dashboard → Users → Find your user → Copy the ID
  const ALLOWED_ADMINS = [
    'user_33JCkRttdAaSGCwF2sgFZd6wev9',  // Replace with your actual user ID
    // Add more admin IDs here if needed
  ]

  useEffect(() => {
    if (isLoaded && !ALLOWED_ADMINS.includes(userId || '')) {
      router.push('/dashboard')
    }
  }, [isLoaded, userId, router])

  // Show nothing while checking auth
  if (!isLoaded) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  // Check if user is admin
  if (!ALLOWED_ADMINS.includes(userId || '')) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-600">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  const inviteStudio = async () => {
    // Validation
    if (!email || !studioName) {
      setMessage('Please fill in all fields')
      return
    }

    if (!email.includes('@')) {
      setMessage('Please enter a valid email')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/invite-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, studioName })
      })
      
      const data:any = await response.json()
      
      if (!response.ok) {
        setMessage(`Error: ${data.error || 'Failed to invite studio'}`)
        return
      }
      
      if (data.success) {
        setMessage(`✅ Studio invited successfully! Temporary password: ${data.tempPassword}`)
        // Clear form
        setEmail('')
        setStudioName('')
      } else {
        setMessage(`Error: ${data.error || 'Unknown error occurred'}`)
      }
    } catch (error) {
      console.error('Invite error:', error)
      setMessage('Failed to invite studio. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8 max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Platform Admin</h1>
          <p className="text-gray-600">Manage studios and platform settings</p>
        </div>

        {/* Invite Studio Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Invite New Studio</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Studio Email
              </label>
              <input
                type="email"
                placeholder="studio@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Studio Name
              </label>
              <input
                type="text"
                placeholder="Awesome Studio"
                value={studioName}
                onChange={(e) => setStudioName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
            
            <button
              onClick={inviteStudio}
              disabled={loading}
              className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? 'Sending Invitation...' : 'Send Studio Invitation'}
            </button>
            
            {message && (
              <div className={`mt-4 p-4 rounded-lg ${
                message.includes('Error') 
                  ? 'bg-red-50 text-red-800 border border-red-200' 
                  : 'bg-green-50 text-green-800 border border-green-200'
              }`}>
                <pre className="whitespace-pre-wrap font-sans text-sm">{message}</pre>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Admin Quick Links</h3>
          <div className="flex gap-4">
            <a href="/dashboard" className="text-blue-600 hover:underline">
              → Back to Dashboard
            </a>
            <a href="https://dashboard.clerk.com" target="_blank" className="text-blue-600 hover:underline">
              → Clerk Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}