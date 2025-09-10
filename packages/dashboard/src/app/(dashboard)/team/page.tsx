// packages/dashboard/src/app/(dashboard)/team/page.tsx
'use client'

import { useState } from 'react'
import { useOrganization } from '@clerk/nextjs'
import { Plus, Trash2, Shield, Users } from 'lucide-react'

export default function TeamManagementPage() {
  const { organization, membership, memberships } = useOrganization({
    memberships: true,
    // Don't fetch invitations - it causes 403 for non-admins
  })
  const [showInviteModal, setShowInviteModal] = useState(false)

  // Check if current user is admin
  const isAdmin = membership?.role === 'org:admin'

  if (!organization) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">No organization found.</p>
        </div>
      </div>
    )
  }

  // Only admins can access team management
  if (!isAdmin) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-700">Only administrators can access team management.</p>
        </div>
      </div>
    )
  }

  const members = memberships?.data || []

  const handleInvite = async (email: string, role: string) => {
    try {
      await organization.inviteMember({
        emailAddress: email,
        role: role === 'admin' ? 'org:admin' : 'org:member',
      })
      
      alert(`Invitation sent to ${email}`)
      setShowInviteModal(false)
    } catch (error: any) {
      alert(error.errors?.[0]?.message || 'Failed to send invitation')
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Remove this member?')) return
    
    try {
      await organization.removeMember(userId)
    } catch (error) {
      alert('Failed to remove member')
    }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-gray-600 mt-2">Manage your organization members</p>
        </div>
        
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Invite Member
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Team Members ({members.length})</h2>
        </div>
        
        <div className="divide-y">
          {members.map((member) => (
            <div key={member.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                  {member.publicUserData?.firstName?.[0] || 
                   member.publicUserData?.identifier?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="font-medium">
                    {member.publicUserData?.firstName || 'Member'} 
                    {member.publicUserData?.lastName || ''}
                  </p>
                  <p className="text-sm text-gray-500">
                    {member.publicUserData?.identifier}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  member.role === 'org:admin' 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {member.role === 'org:admin' ? 'Admin' : 'Member'}
                </span>
                
                {member.publicUserData?.userId !== membership.publicUserData?.userId && (
                  <button
                    onClick={() => handleRemoveMember(member.publicUserData?.userId!)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showInviteModal && (
        <InviteModal
          onClose={() => setShowInviteModal(false)}
          onInvite={handleInvite}
        />
      )}
    </div>
  )
}

function InviteModal({ onClose, onInvite }: any) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email')
      return
    }
    
    setIsSubmitting(true)
    await onInvite(email, role)
    setIsSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Invite Team Member</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="member@example.com"
              disabled={isSubmitting}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              disabled={isSubmitting}
            >
              <option value="member">Member - View and edit content</option>
              <option value="admin">Admin - Full access</option>
            </select>
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Sending...' : 'Send Invite'}
          </button>
        </div>
      </div>
    </div>
  )
}