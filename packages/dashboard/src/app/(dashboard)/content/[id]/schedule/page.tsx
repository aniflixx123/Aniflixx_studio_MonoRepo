import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

async function getScheduledEpisodes(seriesId: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/series/${seriesId}/episodes?status=scheduled`,
      { cache: 'no-store' }
    )
    
    if (!response.ok) return []
    
    const data:any = await response.json()
    return data.episodes || []
  } catch (error) {
    console.error('Error fetching scheduled episodes:', error)
    return []
  }
}

export default async function SchedulePage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { userId, orgId } = await auth()
  
  if (!userId || !orgId) {
    redirect('/sign-in')
  }
  
  const { id } = await params
  const scheduledEpisodes = await getScheduledEpisodes(id)

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href={`/content/${id}`} className="text-blue-600 hover:underline">
          ← Back to Series
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold mb-6">Release Schedule</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Scheduled Episodes</h2>
        
        {scheduledEpisodes.length === 0 ? (
          <p className="text-gray-500">No scheduled episodes</p>
        ) : (
          <div className="space-y-3">
            {scheduledEpisodes.map((episode: any) => (
              <div key={episode.id} className="border rounded p-4">
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-medium">
                      Episode {episode.episode_number}: {episode.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Scheduled for: {new Date(episode.scheduled_at).toLocaleString()}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
                    Scheduled
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}