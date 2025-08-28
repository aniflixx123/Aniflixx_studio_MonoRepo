import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

type TeamMember = {
  id: string
  user_id: string
  email: string
  role: string
  created_at: string
}

async function getTeamMembers(orgId: string): Promise<TeamMember[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/team`, {
      headers: {
        'X-Org-Id': orgId
      },
      cache: 'no-store'
    })
    
    if (!response.ok) return []
    
    const data:any = await response.json()
    return data.team || []
  } catch (error) {
    console.error('Error fetching team:', error)
    return []
  }
}

export default async function TeamPage() {
  const { userId, orgId } = await auth()
  
  if (!userId || !orgId) {
    redirect('/sign-in')
  }
  
  const teamMembers = await getTeamMembers(orgId)
  
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Team Management</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Team Members ({teamMembers.length}/5)</h2>
          <p className="text-gray-600">Free plan allows up to 5 team members</p>
        </div>
        
        <div className="space-y-3">
          {teamMembers.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-3 border rounded">
              <div>
                <p className="font-medium">{member.email}</p>
                <p className="text-sm text-gray-600 capitalize">{member.role}</p>
              </div>
              <span className="text-sm text-gray-500">
                Joined {new Date(member.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
        
        <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Invite Team Member
        </button>
      </div>
    </div>
  )
}