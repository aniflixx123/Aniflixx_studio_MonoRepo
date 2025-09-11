'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import Image from 'next/image'

export default function HomePage() {
  const { isSignedIn } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-white to-gray-50 -z-10"></div>
      
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/90 backdrop-blur-xl shadow-sm' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-10">
              <Link href="/" className="text-2xl font-bold text-gray-900">
                Aniflixx
              </Link>
              <div className="hidden md:flex items-center space-x-8">
                <Link href="#app" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                  Mobile App
                </Link>
                <Link href="#studio" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                  For Studios
                </Link>
                <Link href="/careers" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                  Careers
                </Link>
              </div>
            </div>
            
            <div className="hidden md:flex items-center space-x-4">
              <Link 
                href="/sign-in" 
                className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Studio Login
              </Link>
              <a 
                href="https://play.google.com/store/apps/details?id=com.aniflixx" 
                className="px-5 py-2.5 text-sm font-semibold text-white bg-gray-900 rounded-full hover:bg-gray-800 transition-all"
              >
                Get the App
              </a>
            </div>

            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gray-100 rounded-full blur-3xl opacity-50"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gray-100 rounded-full blur-3xl opacity-50"></div>
        </div>
        
        <div className="relative max-w-5xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 leading-tight mb-6">
            The Complete Platform for
            <span className="block text-gray-600">
              Anime & Manga
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto">
            Social platform for fans. Direct distribution for studios. 
            Real-time engagement for everyone.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="https://play.google.com/store/apps/details?id=com.aniflixx" 
              className="px-8 py-4 text-base font-semibold text-white bg-gray-900 rounded-full hover:bg-gray-800 transition-all inline-flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 20.5v-17c0-.59.34-1.11.84-1.35l13.69 8.5-13.69 8.5c-.5-.24-.84-.76-.84-1.35zm14.76-8.51L5.91 5.31v13.38l11.85-6.7z"/>
              </svg>
              Download App
            </a>
            <Link 
              href="/sign-in" 
              className="px-8 py-4 text-base font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-full hover:bg-gray-50 transition-all"
            >
              Studio Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Mobile App Section */}
      <section id="app" className="py-20 px-6 relative overflow-hidden">
        {/* Background accent */}
        <div className="absolute inset-0">
          <div className="absolute top-20 -left-40 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-10"></div>
          <div className="absolute bottom-20 -right-40 w-96 h-96 bg-purple-500 rounded-full blur-3xl opacity-10"></div>
        </div>

        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-gray-800 rounded-full text-sm font-medium mb-4">
              NATIVE MOBILE APP
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Where anime fans
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                come alive
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Not just another streaming app. This is your anime social universe.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center mt-16">
            <div className="space-y-6">
              <div className="group relative">
                <div className="absolute -inset-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur opacity-0 group-hover:opacity-20 transition duration-500"></div>
                <div className="relative bg-white p-6 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Flicks <span className="text-sm font-normal text-gray-500">— Your 60-second stage</span>
                      </h3>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        Create viral anime edits with built-in tools. Watch endless Flicks. Real-time engagement with instant likes, comments that matter, and view counts that update live.
                      </p>
                      <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          In-app editor
                        </span>
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Real-time stats
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="group relative">
                <div className="absolute -inset-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg blur opacity-0 group-hover:opacity-20 transition duration-500"></div>
                <div className="relative bg-white p-6 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Clans <span className="text-sm font-normal text-gray-500">— Find your tribe</span>
                      </h3>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        Not just groups, but living communities. Join 5 clans max. Each with exclusive content, real-time chat that feels alive with typing indicators, reactions, and instant updates.
                      </p>
                      <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Live chat
                        </span>
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Exclusive content
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="group relative">
                <div className="absolute -inset-2 bg-gradient-to-r from-pink-500 to-orange-500 rounded-lg blur opacity-0 group-hover:opacity-20 transition duration-500"></div>
                <div className="relative bg-white p-6 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-pink-500 to-orange-500 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        The Hub <span className="text-sm font-normal text-gray-500">— Everything, everywhere</span>
                      </h3>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        Three feeds, infinite possibilities. Community for connections, Trending for what's hot, Clan feeds for your inner circle. All updated in real-time.
                      </p>
                      <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Multi-feed
                        </span>
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Discover mode
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4 mt-8">
                <a 
                  href="https://play.google.com/store/apps/details?id=com.aniflixx" 
                  className="flex-1 px-6 py-3 text-center font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
                >
                  Get it on Google Play
                </a>
                <button className="px-6 py-3 font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  iOS Coming Soon
                </button>
              </div>
            </div>
            
            <div className="relative flex justify-center lg:justify-end">
              <div className="relative">
                {/* Phone mockup with glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-[3rem] blur-2xl opacity-30"></div>
                <div className="relative w-[350px]">
                  <Image 
                    src="/mobile-app-mockup.png"
                    alt="Aniflixx Mobile App"
                    width={350}
                    height={700}
                    className="w-full h-auto rounded-[2.5rem] shadow-2xl"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom feature strip */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">∞</div>
              <p className="text-sm text-gray-600 mt-1">Flicks to watch</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">5</div>
              <p className="text-sm text-gray-600 mt-1">Clans to join</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">24/7</div>
              <p className="text-sm text-gray-600 mt-1">Real-time chat</p>
            </div>
          </div>
        </div>
      </section>

      {/* Studio Dashboard Section */}
      <section id="studio" className="py-20 px-6 bg-gray-50/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Powerful Studio Dashboard
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Complete control over your content distribution. Upload once, reach millions of fans directly.
            </p>
          </div>

          {/* Dashboard Screenshots - Mobile Friendly Stack */}
          <div className="max-w-6xl mx-auto mb-16">
            <div className="space-y-8">
              {/* Analytics Dashboard */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="relative bg-white rounded-2xl shadow-xl overflow-hidden">
                  <div className="bg-gray-900 h-8 flex items-center px-4">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="flex-1 text-center text-xs text-white/60">Analytics Dashboard</div>
                  </div>
                  <Image 
                    src="/dashboard-analytics.png"
                    alt="Analytics Dashboard"
                    width={1400}
                    height={900}
                    className="w-full h-auto"
                    priority
                  />
                </div>
              </div>

              {/* Content Library */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="relative bg-white rounded-2xl shadow-xl overflow-hidden">
                  <div className="bg-gray-900 h-8 flex items-center px-4">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="flex-1 text-center text-xs text-white/60">Content Library</div>
                  </div>
                  <Image 
                    src="/dashboard-content-library.png"
                    alt="Content Library"
                    width={1400}
                    height={900}
                    className="w-full h-auto"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Studio Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Content Management</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>• Upload anime episodes & movies</li>
                <li>• Upload manga chapters with covers</li>
                <li>• Batch upload capabilities</li>
                <li>• Metadata management</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Scheduling & Release</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>• Queue content in advance</li>
                <li>• Set specific release times</li>
                <li>• Timezone management</li>
                <li>• Automated publishing</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Analytics & AI</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>• Real-time view counts</li>
                <li>• Watch time analytics</li>
                <li>• AI-powered insights</li>
                <li>• Audience demographics</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Distribution Control</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>• Geo-lock by region</li>
                <li>• Age restrictions</li>
                <li>• Visibility settings</li>
                <li>• Content protection</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Team Collaboration</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>• Role-based access control</li>
                <li>• Multiple team members</li>
                <li>• Permission management</li>
                <li>• Activity logs</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Revenue & Monetization</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>• Multiple revenue models</li>
                <li>• Transparent reporting</li>
                <li>• Payment processing</li>
                <li>• Revenue analytics</li>
              </ul>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link 
              href="/sign-in" 
              className="inline-block px-8 py-3.5 text-base font-semibold text-white bg-gray-900 rounded-full hover:bg-gray-800 transition-colors"
            >
              Access Studio Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Built with cutting-edge technology
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Real-time, scalable, and optimized for mobile
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">WebSockets</h3>
              <p className="text-gray-600 text-sm">Real-time chat, likes, and updates</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Native Mobile</h3>
              <p className="text-gray-600 text-sm">iOS and Android native apps</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Durable Objects</h3>
              <p className="text-gray-600 text-sm">Persistent real-time state</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4M20 12l-4-4m4 4l-4 4" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Offline Queue</h3>
              <p className="text-gray-600 text-sm">Works even with poor connection</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">AI Analytics</h3>
              <p className="text-gray-600 text-sm">Smart insights for studios</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Global CDN</h3>
              <p className="text-gray-600 text-sm">Fast streaming worldwide</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Secure</h3>
              <p className="text-gray-600 text-sm">Content protection & privacy</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Scalable</h3>
              <p className="text-gray-600 text-sm">Handles millions of users</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gray-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to join Aniflixx?
          </h2>
          <p className="text-lg text-gray-300 mb-8">
            Whether you're a fan, creator, or studio - we have everything you need
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="https://play.google.com/store/apps/details?id=com.aniflixx" 
              className="inline-block px-8 py-3.5 text-base font-semibold text-gray-900 bg-white rounded-full hover:bg-gray-100 transition-colors"
            >
              Download Mobile App
            </a>
            <Link 
              href="/sign-in" 
              className="inline-block px-8 py-3.5 text-base font-semibold text-white bg-transparent border-2 border-white rounded-full hover:bg-white/10 transition-colors"
            >
              Studio Dashboard Login
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-2">
              <Link href="/" className="text-xl font-bold text-gray-900">
                Aniflixx
              </Link>
              <p className="mt-3 text-sm text-gray-600">
                The complete platform for anime & manga
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">App</h4>
              <ul className="space-y-2">
                <li><a href="https://play.google.com/store/apps/details?id=com.aniflixx" className="text-sm text-gray-600 hover:text-gray-900">Android App</a></li>
                <li><Link href="#" className="text-sm text-gray-600 hover:text-gray-900">Features</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Studios</h4>
              <ul className="space-y-2">
                <li><Link href="/sign-in" className="text-sm text-gray-600 hover:text-gray-900">Dashboard Login</Link></li>
                <li><Link href="/docs" className="text-sm text-gray-600 hover:text-gray-900">Documentation</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Company</h4>
              <ul className="space-y-2">
                <li><Link href="/careers" className="text-sm text-gray-600 hover:text-gray-900">Careers</Link></li>
                <li><Link href="/about" className="text-sm text-gray-600 hover:text-gray-900">About</Link></li>
                <li><Link href="/contact" className="text-sm text-gray-600 hover:text-gray-900">Contact</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-600">
              © 2025 Aniflixx. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/privacy" className="text-sm text-gray-600 hover:text-gray-900">Privacy</Link>
              <Link href="/terms" className="text-sm text-gray-600 hover:text-gray-900">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}