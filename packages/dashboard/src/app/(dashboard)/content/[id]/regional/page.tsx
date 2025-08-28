import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import RegionalSettings from '@/components/RegionalSettings'

export default async function RegionalSettingsPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { userId, orgId } = await auth()
  
  if (!userId || !orgId) {
    redirect('/sign-in')
  }
  
  const { id } = await params

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href={`/content/${id}`} className="text-blue-600 hover:underline">
          ← Back to Series
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold mb-6">Regional Settings</h1>
      
      <RegionalSettings seriesId={id} />
    </div>
  )
}