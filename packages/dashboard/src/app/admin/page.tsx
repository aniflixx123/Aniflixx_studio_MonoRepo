'use client'

import { useState } from 'react'

export default function AdminPage() {
  const [email, setEmail] = useState('')
  const [studioName, setStudioName] = useState('')
  const [message, setMessage] = useState('')

  const inviteStudio = async () => {
    try {
      const response = await fetch('/api/invite-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, studioName })
      })
      
      const data = await response.json() as { success: boolean; tempPassword?: string; error?: string }
      if (data.success) {
        setMessage(`Studio invited successfully! Password: ${data.tempPassword}`)
        setEmail('')
        setStudioName('')
      } else {
        setMessage('Error: ' + data.error)
      }
    } catch (error) {
      setMessage('Failed to invite studio')
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Admin - Invite Studio</h1>
      
      <div className="space-y-4">
        <input
          type="email"
          placeholder="Studio Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded"
        />
        
        <input
          type="text"
          placeholder="Studio Name"
          value={studioName}
          onChange={(e) => setStudioName(e.target.value)}
          className="w-full p-2 border rounded"
        />
        
        <button
          onClick={inviteStudio}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Invite Studio
        </button>
        
        {message && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            {message}
          </div>
        )}
      </div>
    </div>
  )
}