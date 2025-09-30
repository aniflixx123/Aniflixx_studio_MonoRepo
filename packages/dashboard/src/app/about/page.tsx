// app/about/page.tsx
'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function AboutPage() {
  const [activeFeature, setActiveFeature] = useState<number | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const [userCount, setUserCount] = useState(0)
  
  useEffect(() => {
    // Animate user counter
    const interval = setInterval(() => {
      setUserCount(prev => prev < 1000 ? prev + 25 : 1000)
    }, 30)
    
    // Handle scroll
    const handleScroll = () => {
      setScrolled(window.scrollY > 100)
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => {
      clearInterval(interval)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const stats = [
    { 
      number: `${userCount}+`, 
      label: 'Active Users', 
      description: 'Growing globally',
      gradient: 'from-blue-500 to-purple-500'
    },
    { 
      number: '60s', 
      label: 'Flicks Format', 
      description: 'Perfect for mobile',
      gradient: 'from-purple-500 to-pink-500'
    },
    { 
      number: '24/7', 
      label: 'Real-time', 
      description: 'Always connected',
      gradient: 'from-pink-500 to-orange-500'
    },
    { 
      number: '5', 
      label: 'Max Clans', 
      description: 'Multiple communities',
      gradient: 'from-orange-500 to-red-500'
    },
  ]

  const features = [
    {
      title: 'Flicks',
      description: '60-second vertical videos for the TikTok generation',
      icon: '🎬',
      details: [
        'Swipe through endless anime content',
        'Built-in video editor',
        'Real-time engagement metrics',
        'Viral potential built-in'
      ],
      gradient: 'from-blue-500 to-purple-500'
    },
    {
      title: 'The Hub',
      description: 'Three personalized feeds that adapt to you',
      icon: '📱',
      details: [
        'Community feed for connections',
        'Trending for viral content',
        'Clan feed for your tribes',
        'Smart recommendations'
      ],
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      title: 'Clans',
      description: 'Not just groups - living, breathing communities',
      icon: '⚔️',
      details: [
        'Join up to 5 clans',
        'Real-time chat with typing indicators',
        'Exclusive clan content',
        'Community moderation'
      ],
      gradient: 'from-pink-500 to-orange-500'
    },
    {
      title: 'Studio Portal',
      description: 'Invite-only dashboard for content partners',
      icon: '🎨',
      details: [
        'Direct distribution control',
        'Real-time analytics',
        'Audience insights',
        'Revenue management'
      ],
      gradient: 'from-orange-500 to-red-500'
    },
  ]

  const journey = [
    {
      phase: 'April 2025',
      title: 'Foundation',
      description: 'Started with a vision to make anime social',
      status: 'completed',
      icon: '🚀'
    },
    {
      phase: 'Now',
      title: 'Live & Growing',
      description: 'Android app on Play Store, community expanding daily',
      status: 'active',
      icon: '📱'
    },
    {
      phase: 'Q2 2025',
      title: 'iOS Launch',
      description: 'Bringing Aniflixx to Apple users worldwide',
      status: 'upcoming',
      icon: '🍎'
    },
    {
      phase: '50K MAU',
      title: 'Scale Up',
      description: 'Team expansion in India, advanced features',
      status: 'future',
      icon: '🌏'
    },
  ]

  const problems = [
    {
      issue: 'Passive Consumption',
      detail: 'Current platforms: Watch alone, no interaction'
    },
    {
      issue: 'No Community',
      detail: 'Anime fans scattered across different platforms'
    },
    {
      issue: 'Studio Struggles',
      detail: 'No direct access to global audience'
    }
  ]

  const solutions = [
    {
      solution: 'Social-First Design',
      detail: 'Every feature built for engagement'
    },
    {
      solution: 'Real-Time Everything',
      detail: 'Chat, reactions, updates - all instant'
    },
    {
      solution: 'Direct Distribution',
      detail: 'Studios connect directly with fans'
    }
  ]

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50"></div>
        <div className="absolute top-0 -left-40 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float"></div>
        <div className="absolute top-40 -right-40 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float animation-delay-2000"></div>
        <div className="absolute -bottom-40 left-20 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float animation-delay-4000"></div>
      </div>

      {/* Simple back button */}
      <div className={`fixed top-6 left-6 z-50 transition-all duration-300 ${scrolled ? 'opacity-100' : 'opacity-70'}`}>
        <Link 
          href="/" 
          className="inline-flex items-center px-4 py-2 bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 transition-all hover:scale-105 group"
        >
          <svg className="w-5 h-5 mr-2 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="text-sm font-medium text-gray-700">Home</span>
        </Link>
      </div>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-full text-sm font-medium text-green-700 mb-6 animate-pulse-slow">
              <span className="flex h-2 w-2 mr-2">
                <span className="animate-ping absolute h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                <span className="relative h-2 w-2 rounded-full bg-green-500"></span>
              </span>
              Live on Google Play
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black text-gray-900 leading-tight mb-6 animate-fade-in">
              Where Anime Fans
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 animate-gradient-x">
                Come Alive
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-10 animate-fade-in animation-delay-200">
              Not just another streaming app. Aniflixx is your <span className="font-semibold text-gray-900">social anime universe</span> where 
              you create, share, and connect in real-time.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in animation-delay-400">
              <a 
                href="https://play.google.com/store/apps/details?id=com.aniflixx"
                className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-semibold hover:shadow-2xl transition-all transform hover:scale-105 flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 20.5v-17c0-.59.34-1.11.84-1.35l13.69 8.5-13.69 8.5c-.5-.24-.84-.76-.84-1.35zm14.76-8.51L5.91 5.31v13.38l11.85-6.7z"/>
                </svg>
                Download Now
              </a>
              <Link 
                href="/sign-in"
                className="group px-8 py-4 bg-white text-gray-900 border-2 border-gray-900 rounded-full font-semibold hover:bg-gray-900 hover:text-white transition-all transform hover:scale-105"
              >
                Studio Access
                <span className="inline-block ml-2 text-xs opacity-60">(Invite Only)</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Problem & Solution - Visual Cards */}
      <section className="py-20 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why We Built Aniflixx
            </h2>
            <p className="text-lg text-gray-600">
              The anime community deserved better
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Problems */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center mr-3 text-sm">✗</span>
                The Problems
              </h3>
              {problems.map((item, index) => (
                <div 
                  key={index}
                  className="p-6 bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl border border-red-100 transform hover:scale-105 transition-all"
                >
                  <h4 className="font-bold text-gray-900 mb-2">{item.issue}</h4>
                  <p className="text-gray-600">{item.detail}</p>
                </div>
              ))}
            </div>
            
            {/* Solutions */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center mr-3 text-sm">✓</span>
                Our Solutions
              </h3>
              {solutions.map((item, index) => (
                <div 
                  key={index}
                  className="p-6 bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl border border-green-100 transform hover:scale-105 transition-all"
                >
                  <h4 className="font-bold text-gray-900 mb-2">{item.solution}</h4>
                  <p className="text-gray-600">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features - Interactive Cards */}
      <section className="py-20 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Features That Define Us
            </h2>
            <p className="text-lg text-gray-600">
              Everything you need, nothing you don't
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative"
                onMouseEnter={() => setActiveFeature(index)}
                onMouseLeave={() => setActiveFeature(null)}
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
                <div className="relative bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100">
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 mb-4">{feature.description}</p>
                  
                  <div className={`space-y-2 transition-all duration-500 ${activeFeature === index ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                    {feature.details.map((detail, i) => (
                      <div key={i} className="flex items-start text-sm">
                        <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${feature.gradient} mt-1.5 mr-2 flex-shrink-0`}></span>
                        <span className="text-gray-600">{detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section - Animated Numbers */}
      <section className="py-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600"></div>
        <div className="absolute inset-0 bg-black/10"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="text-center group cursor-pointer"
              >
                <div className={`text-5xl md:text-6xl font-black text-white mb-2 transform group-hover:scale-110 transition-transform`}>
                  {stat.number}
                </div>
                <div className="text-white/90 font-semibold text-lg">{stat.label}</div>
                <div className="text-white/70 text-sm">{stat.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Journey Timeline */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Our Journey
            </h2>
            <p className="text-lg text-gray-600">
              From idea to impact in record time
            </p>
          </div>
          
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-blue-500 to-purple-500 hidden md:block"></div>
            
            <div className="space-y-12">
              {journey.map((item, index) => (
                <div 
                  key={index} 
                  className={`flex flex-col md:flex-row items-center ${
                    index % 2 === 0 ? 'md:flex-row-reverse' : ''
                  }`}
                >
                  <div className="flex-1">
                    <div className={`bg-white rounded-2xl shadow-xl p-8 ${
                      index % 2 === 0 ? 'md:ml-8' : 'md:mr-8'
                    } ${item.status === 'active' ? 'ring-4 ring-blue-500 ring-opacity-50' : ''}`}>
                      <div className="flex items-center mb-4">
                        <span className="text-3xl mr-3">{item.icon}</span>
                        <div>
                          <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                            item.status === 'completed' ? 'bg-green-100 text-green-700' :
                            item.status === 'active' ? 'bg-blue-100 text-blue-700' :
                            item.status === 'upcoming' ? 'bg-purple-100 text-purple-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {item.phase}
                          </span>
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{item.title}</h3>
                      <p className="text-gray-600">{item.description}</p>
                    </div>
                  </div>
                  
                  <div className="hidden md:flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-lg border-4 border-purple-500 z-10">
                    <span className="text-purple-600 font-bold">{index + 1}</span>
                  </div>
                  
                  <div className="flex-1"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team Section - Simplified */}
      <section className="py-20 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Building the Future
            </h2>
            <p className="text-lg text-gray-600">
              A lean team with massive ambitions
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-3xl p-10 shadow-xl">
            <div className="grid md:grid-cols-2 gap-10">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-6">Today</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-xl shadow-sm">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                      <span className="text-gray-700">Founding team driving vision</span>
                    </div>
                  </div>
                  <div className="p-4 bg-white rounded-xl shadow-sm">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                      <span className="text-gray-700">Product development team</span>
                    </div>
                  </div>
                  <div className="p-4 bg-white rounded-xl shadow-sm">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-pink-500 rounded-full mr-3"></div>
                      <span className="text-gray-700">Development interns</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-6">At 50K Users</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-purple-200">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mr-3"></div>
                      <span className="text-gray-700 font-medium">Native app developers</span>
                    </div>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-pink-200">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mr-3"></div>
                      <span className="text-gray-700 font-medium">Backend engineers</span>
                    </div>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-pink-50 to-orange-50 rounded-xl border border-orange-200">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full mr-3"></div>
                      <span className="text-gray-700 font-medium">Content managers</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-10 text-center">
              <Link 
                href="/careers" 
                className="inline-flex items-center text-purple-600 font-semibold hover:text-purple-700 transition-colors group"
              >
                Join our mission 
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-gray-900 via-purple-900 to-black">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Be Part of the Revolution
          </h2>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Join thousands of anime fans who've already discovered a better way to connect
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="https://play.google.com/store/apps/details?id=com.aniflixx"
              className="group px-8 py-4 bg-white text-gray-900 rounded-full font-semibold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-2xl"
            >
              <span className="flex items-center justify-center">
                Download for Android
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
            </a>
            <Link 
              href="/sign-in"
              className="px-8 py-4 border-2 border-white text-white rounded-full font-semibold hover:bg-white hover:text-gray-900 transition-all transform hover:scale-105"
            >
              Studio Portal
            </Link>
          </div>
          
          <p className="text-sm text-gray-400 mt-6">
            iOS coming soon • Studio access is invite-only
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Aniflixx
              </Link>
              <p className="text-sm text-gray-600 mt-2">© 2025 Aniflixx. All rights reserved.</p>
            </div>
            <div className="flex flex-wrap gap-6">
              <Link href="/privacy" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Privacy</Link>
              <Link href="/terms" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Terms</Link>
              <Link href="/documentation" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Documentation</Link>
              <Link href="/careers" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Careers</Link>
              <Link href="/contact" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(-30px) translateX(20px); }
          66% { transform: translateY(20px) translateX(-10px); }
        }
        
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        
        .animate-float {
          animation: float 20s ease-in-out infinite;
        }
        
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }
        
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
        
        .animation-delay-200 {
          animation-delay: 0.2s;
          animation-fill-mode: both;
        }
        
        .animation-delay-400 {
          animation-delay: 0.4s;
          animation-fill-mode: both;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}