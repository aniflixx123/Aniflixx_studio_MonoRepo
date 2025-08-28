import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function AnalyticsPage() {
  const { userId, orgId } = await auth()
  
  if (!userId || !orgId) {
    redirect('/sign-in')
  }
  
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Analytics</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Analytics Available in Growth Plan</h2>
          <p className="text-gray-600">Upgrade to see detailed analytics about your content performance</p>
          <button className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
            Upgrade to Growth
          </button>
        </div>
      </div>
    </div>
  )
}