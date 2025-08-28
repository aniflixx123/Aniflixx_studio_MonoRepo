'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'

export default function Navigation() {
  const pathname = usePathname()
  
  const isActive = (path: string) => {
    return pathname.startsWith(path) ? 'bg-blue-700' : ''
  }
  
  return (
    <nav className="bg-blue-600 text-white">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="text-xl font-bold">
              Aniflixx Studio
            </Link>
            
            <div className="flex space-x-4">
              <Link 
                href="/dashboard" 
                className={`px-3 py-2 rounded hover:bg-blue-700 ${isActive('/dashboard')}`}
              >
                Dashboard
              </Link>
              
              <Link 
                href="/content" 
                className={`px-3 py-2 rounded hover:bg-blue-700 ${isActive('/content')}`}
              >
                Content
              </Link>
              
              <Link 
                href="/analytics" 
                className={`px-3 py-2 rounded hover:bg-blue-700 ${isActive('/analytics')}`}
              >
                Analytics
              </Link>
              
              <Link 
                href="/team" 
                className={`px-3 py-2 rounded hover:bg-blue-700 ${isActive('/team')}`}
              >
                Team
              </Link>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm">Free Plan</span>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </div>
    </nav>
  )
}