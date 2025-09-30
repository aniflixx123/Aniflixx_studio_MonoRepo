// app/documentation/page.tsx
'use client'
import Link from 'next/link'
import { useState } from 'react'

export default function DocumentationPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('getting-started')

  const categories = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: '🚀',
      items: [
        { title: 'Quick Start Guide', desc: 'Get up and running in 5 minutes' },
        { title: 'Studio Registration', desc: 'How to register as a content studio' },
        { title: 'Platform Overview', desc: 'Understanding the Aniflixx ecosystem' },
        { title: 'Account Setup', desc: 'Configure your studio profile' },
      ]
    },
    {
      id: 'content-management',
      title: 'Content Management',
      icon: '📁',
      items: [
        { title: 'Uploading Content', desc: 'Upload anime episodes and manga chapters' },
        { title: 'Series Management', desc: 'Organize your series and seasons' },
        { title: 'Content Formats', desc: 'Supported file types and specifications' },
        { title: 'Metadata Guidelines', desc: 'Best practices for content metadata' },
      ]
    },
    {
      id: 'monetization',
      title: 'Monetization',
      icon: '💰',
      items: [
        { title: 'Revenue Models', desc: 'Understanding different monetization options' },
        { title: 'Pricing Strategies', desc: 'Set up premium content and pricing' },
        { title: 'Payment Processing', desc: 'How payments work on Aniflixx' },
        { title: 'Revenue Analytics', desc: 'Track your earnings and performance' },
      ]
    },
    {
      id: 'api-integration',
      title: 'API & Integration',
      icon: '🔌',
      items: [
        { title: 'API Overview', desc: 'Introduction to Aniflixx API' },
        { title: 'Authentication', desc: 'API keys and authentication methods' },
        { title: 'Endpoints Reference', desc: 'Complete API endpoint documentation' },
        { title: 'Webhooks', desc: 'Real-time event notifications' },
      ]
    },
    {
      id: 'analytics',
      title: 'Analytics & Insights',
      icon: '📊',
      items: [
        { title: 'Dashboard Overview', desc: 'Understanding your analytics dashboard' },
        { title: 'Audience Metrics', desc: 'Track viewer engagement and demographics' },
        { title: 'Content Performance', desc: 'Analyze content popularity and trends' },
        { title: 'Export Reports', desc: 'Download and share analytics data' },
      ]
    },
    {
      id: 'best-practices',
      title: 'Best Practices',
      icon: '⭐',
      items: [
        { title: 'Content Quality', desc: 'Guidelines for high-quality uploads' },
        { title: 'SEO Optimization', desc: 'Improve content discoverability' },
        { title: 'Community Guidelines', desc: 'Building engagement with fans' },
        { title: 'Release Strategies', desc: 'Optimize your release schedule' },
      ]
    }
  ]

  const filteredCategories = categories.map(category => ({
    ...category,
    items: category.items.filter(item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => searchQuery === '' || category.items.length > 0)

  return (
    <div className="min-h-screen bg-white">
      {/* Gradient Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-white to-gray-50 -z-10 animate-gradient-x"></div>
      
      {/* Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full blur-3xl opacity-70 animate-pulse-slow"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full blur-3xl opacity-70 animate-pulse-slow animation-delay-2000"></div>
      </div>

      {/* Back Button */}
      <div className="sticky top-4 z-50 flex justify-start pt-4 px-6">
        <Link 
          href="/" 
          className="flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="text-sm font-medium text-gray-700">Back to Home</span>
        </Link>
      </div>

      {/* Hero Section */}
      <section className="relative pt-16 pb-12 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full text-sm font-medium text-gray-800 mb-6">
            <span className="flex h-3 w-3 mr-2">
              <span className="relative h-3 w-3 rounded-full bg-blue-500"></span>
            </span>
            Complete Documentation
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Aniflixx Studio
            <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Documentation Hub
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Everything you need to know about managing your content, growing your audience, and maximizing revenue on Aniflixx.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-6 py-4 pl-12 text-lg border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="px-6 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-4">
            <Link href="#" className="group relative bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all">
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur opacity-0 group-hover:opacity-20 transition duration-500"></div>
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white text-2xl mb-3">
                  📺
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Video Tutorial</h3>
                <p className="text-sm text-gray-600">Watch our getting started video</p>
              </div>
            </Link>
            
            <Link href="#" className="group relative bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all">
              <div className="absolute -inset-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg blur opacity-0 group-hover:opacity-20 transition duration-500"></div>
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white text-2xl mb-3">
                  💬
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Community Forum</h3>
                <p className="text-sm text-gray-600">Get help from other studios</p>
              </div>
            </Link>
            
            <Link href="#" className="group relative bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all">
              <div className="absolute -inset-2 bg-gradient-to-r from-pink-500 to-orange-500 rounded-lg blur opacity-0 group-hover:opacity-20 transition duration-500"></div>
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-orange-500 rounded-lg flex items-center justify-center text-white text-2xl mb-3">
                  🔧
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">API Reference</h3>
                <p className="text-sm text-gray-600">Integrate with Aniflixx API</p>
              </div>
            </Link>
            
            <Link href="/contact" className="group relative bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all">
              <div className="absolute -inset-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg blur opacity-0 group-hover:opacity-20 transition duration-500"></div>
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center text-white text-2xl mb-3">
                  🎯
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Direct Support</h3>
                <p className="text-sm text-gray-600">Contact our support team</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Main Documentation */}
      <section className="px-6 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <aside className="lg:col-span-1">
              <div className="sticky top-24 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Categories</h3>
                <nav className="space-y-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center ${
                        selectedCategory === category.id
                          ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="mr-2">{category.icon}</span>
                      {category.title}
                    </button>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Content Area */}
            <main className="lg:col-span-3">
              {filteredCategories.map((category) => (
                <div
                  key={category.id}
                  className={category.id === selectedCategory || searchQuery ? 'block' : 'hidden'}
                >
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-8">
                    <div className="flex items-center mb-6">
                      <span className="text-3xl mr-3">{category.icon}</span>
                      <h2 className="text-2xl font-bold text-gray-900">{category.title}</h2>
                    </div>
                    
                    <div className="grid gap-6">
                      {category.items.map((item, index) => (
                        <a
                          key={index}
                          href="#"
                          className="group flex items-start p-4 rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all"
                        >
                          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mr-4">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {item.title}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">{item.desc}</p>
                          </div>
                          <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {/* Additional Resources */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-8 text-white">
                <h2 className="text-2xl font-bold mb-4">Need More Help?</h2>
                <p className="mb-6">
                  Can't find what you're looking for? Our support team is ready to assist you.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link 
                    href="/contact"
                    className="inline-flex items-center justify-center px-6 py-3 bg-white text-gray-900 rounded-full font-semibold hover:bg-gray-100 transition-colors"
                  >
                    Contact Support
                  </Link>
                  <a 
                    href="#"
                    className="inline-flex items-center justify-center px-6 py-3 border-2 border-white text-white rounded-full font-semibold hover:bg-white hover:text-gray-900 transition-colors"
                  >
                    Join Discord Community
                  </a>
                </div>
              </div>
            </main>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-600">
              © 2025 Aniflixx. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/privacy" className="text-sm text-gray-600 hover:text-gray-900">Privacy Policy</Link>
              <Link href="/terms" className="text-sm text-gray-600 hover:text-gray-900">Terms of Service</Link>
              <Link href="/contact" className="text-sm text-gray-600 hover:text-gray-900">Contact</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Custom styles */}
      <style jsx global>{`
        @keyframes gradient-x {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }
        
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 15s ease infinite;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  )
}