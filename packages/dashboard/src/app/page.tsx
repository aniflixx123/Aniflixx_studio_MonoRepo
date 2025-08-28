import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const { userId } = await auth()
  
  if (userId) {
    redirect('/dashboard')
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-800 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-4">Aniflixx Studio Portal</h1>
          <p className="text-xl mb-8">Distribute your anime, manga, and webtoons globally</p>
          
          <div className="space-y-4 max-w-md mx-auto">
            <div className="bg-white/10 backdrop-blur rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-3">For Content Creators</h2>
              <p className="mb-4">Upload and manage your content with powerful analytics</p>
              <Link 
                href="/sign-in" 
                className="inline-block bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
              >
                Sign In to Dashboard
              </Link>
            </div>
            
            <div className="text-sm">
              <p>Invite-only platform</p>
              <p>Contact us for partnership opportunities</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}