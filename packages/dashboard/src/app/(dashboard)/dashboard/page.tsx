import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { fetchAPI } from '@/lib/api'

type Studio = {
  id: string
  clerk_org_id: string
  name: string
  slug: string
  tier: string
  max_users: number
  created_at: string
}

async function getOrCreateStudio(orgId: string, orgSlug: string): Promise<Studio> {
  try {
    // Try to get existing studio
    const studio = await fetchAPI(`/api/studio/${orgId}`) as Studio
    return studio
  } catch (error) {
    // Studio doesn't exist, create it
    const studio = await fetchAPI('/api/studio', {
      method: 'POST',
      body: JSON.stringify({
        orgId: orgId,
        name: orgSlug || 'New Studio',
        slug: orgSlug?.toLowerCase().replace(/\s+/g, '-') || 'new-studio'
      })
    }) as Studio
    return studio
  }
}

export default async function DashboardPage() {
  const { userId, orgId, orgSlug } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }
  
  let studio: Studio | null = null
  if (orgId) {
    studio = await getOrCreateStudio(orgId, orgSlug || '')
  }
  
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Studio Dashboard</h1>
      <div className="mt-6 space-y-2">
        <p>Welcome! You're signed in.</p>
        {studio && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h2 className="font-semibold">Studio Information:</h2>
            <p>Name: {studio.name}</p>
            <p>Tier: {studio.tier}</p>
            <p>Max Users: {studio.max_users}</p>
          </div>
        )}
      </div>
    </div>
  )
}