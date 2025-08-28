import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

type Series = {
  id: string
  title: string
  title_english?: string
  type: string
  status: string
  created_at: string
}

async function getSeries(orgId: string): Promise<Series[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/series?orgId=${orgId}`, {
      cache: 'no-store'
    })
    if (!response.ok) throw new Error('Failed to fetch')
    const data = await response.json() as { series: Series[] }
    return data.series || []
  } catch (error) {
    console.error('Error fetching series:', error)
    return []
  }
}

export default async function ContentPage() {
  const { userId, orgId } = await auth()
  
  if (!userId || !orgId) {
    redirect('/sign-in')
  }
  
  const series = await getSeries(orgId)
  
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Content Library</h1>
        <Link 
  href="/content/new"
  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
>
  Create New Series
</Link>
      </div>
      
      {series.length === 0 ? (
        <div className="bg-gray-100 rounded-lg p-8 text-center text-gray-500">
          <p>No series yet</p>
          <p className="text-sm mt-2">Create your first series to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {series.map((item) => (
  <Link key={item.id} href={`/content/${item.id}`}>
    <div className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow cursor-pointer">
      <div className="aspect-video bg-gray-200 rounded mb-3"></div>
      <h3 className="font-semibold">{item.title}</h3>
      <p className="text-sm text-gray-600 capitalize">{item.type}</p>
      <p className="text-xs text-gray-500 mt-1">
        Status: <span className="capitalize">{item.status}</span>
      </p>
    </div>
  </Link>
))}
        </div>
      )}
    </div>
  )
}