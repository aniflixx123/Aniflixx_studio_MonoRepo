// packages/dashboard/src/app/careers/page.tsx
'use client'
import Link from 'next/link'
import Image from 'next/image'

interface Job {
  id: string
  title: string
  type: string
  location: string
  department: string
}

const JOBS: Job[] = [
  {
    id: 'frontend-engineer-intern',
    title: 'Frontend Engineer Intern',
    type: 'Internship',
    location: 'Remote (Global)',
    department: 'Engineering'
  },
  {
    id: 'backend-engineer-intern',
    title: 'Backend Engineer Intern',
    type: 'Internship',
    location: 'Remote (Global)',
    department: 'Engineering'
  },
  {
    id: 'community-growth-intern',
    title: 'Community & Growth Intern',
    type: 'Internship',
    location: 'Remote (Global)',
    department: 'Marketing'
  }
]

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Subtle gradient background with animation */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-white to-gray-50 -z-10 animate-gradient-x"></div>
      
      {/* Simple Back Button */}
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
      <section className="relative pt-24 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full blur-3xl opacity-70 animate-pulse-slow"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full blur-3xl opacity-70 animate-pulse-slow animation-delay-2000"></div>
        </div>
        
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full text-sm font-medium text-gray-800 mb-6">
            <span className="flex h-3 w-3 mr-2">
              <span className="animate-ping absolute h-3 w-3 rounded-full bg-green-400 opacity-75"></span>
              <span className="relative h-3 w-3 rounded-full bg-green-500"></span>
            </span>
            Now hiring talented individuals
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 leading-tight mb-6">
            Join the
            <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Aniflixx Team
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto">
            Help us revolutionize how anime reaches fans worldwide. Be part of a team that's building the future of anime entertainment.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="#open-positions" 
              className="px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
            >
              View Open Positions
            </a>
            <a 
              href="mailto:careers@aniflixx.com" 
              className="px-8 py-4 text-base font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-full hover:bg-gray-50 transition-all"
            >
              Get in Touch
            </a>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 px-6 relative overflow-hidden">
        {/* Background accent */}
        <div className="absolute inset-0">
          <div className="absolute top-20 -left-40 w-96 h-96 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-3xl opacity-10 animate-pulse-slow"></div>
          <div className="absolute bottom-20 -right-40 w-96 h-96 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-3xl opacity-10 animate-pulse-slow animation-delay-2000"></div>
        </div>

        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Why Work at Aniflixx?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We're building something special. Here's what makes us different.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="group relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur opacity-0 group-hover:opacity-20 transition duration-500"></div>
              <div className="relative bg-white p-8 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Global Impact</h3>
                <p className="text-gray-600">Work on products used by millions of anime fans worldwide. See your work make a real difference every day.</p>
              </div>
            </div>
            
            <div className="group relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg blur opacity-0 group-hover:opacity-20 transition duration-500"></div>
              <div className="relative bg-white p-8 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Remote First</h3>
                <p className="text-gray-600">Work from anywhere in the world with flexible hours. We trust our team to deliver great work regardless of location.</p>
              </div>
            </div>
            
            <div className="group relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-pink-500 to-orange-500 rounded-lg blur opacity-0 group-hover:opacity-20 transition duration-500"></div>
              <div className="relative bg-white p-8 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Fast Growth</h3>
                <p className="text-gray-600">Join a rapidly growing startup with huge potential. Grow your career as we grow our company.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section id="open-positions" className="py-20 px-6 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Open Positions
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              We're looking for talented people to join our team. Explore our current openings below.
            </p>
          </div>
          
          <div className="space-y-6">
            {JOBS.map(job => (
              <Link 
                key={job.id} 
                href={`/careers/${job.id}`}
                className="group block bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {job.title}
                      </h3>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          {job.department}
                        </span>
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {job.location}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 rounded-full text-sm font-medium">
                        {job.type}
                      </span>
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          
          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-6">Don't see a role that fits? We're always looking for talented people.</p>
            <a 
              href="mailto:careers@aniflixx.com" 
              className="inline-block px-6 py-3 text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
            >
              Send Your Resume
            </a>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-gray-900 to-black">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Shape the Future of Anime?
          </h2>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
            Join our team of passionate individuals building the next generation of anime entertainment platforms.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="#open-positions" 
              className="inline-block px-8 py-3.5 text-base font-semibold text-gray-900 bg-white rounded-full hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg"
            >
              View Open Positions
            </a>
            <a 
              href="mailto:careers@aniflixx.com" 
              className="inline-block px-8 py-3.5 text-base font-semibold text-white bg-transparent border-2 border-white rounded-full hover:bg-white/10 transition-all"
            >
              Contact Our Team
            </a>
          </div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="py-8 px-6 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="relative w-8 h-8 mr-2">
                <Image 
                  src="/logo.png"
                  alt="Aniflixx Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-lg font-bold text-gray-900">Aniflixx</span>
            </div>
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

      {/* Custom styles for animations */}
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