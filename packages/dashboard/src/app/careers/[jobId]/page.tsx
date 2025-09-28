// packages/dashboard/src/app/careers/[jobId]/page.tsx
'use client'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { use } from 'react'

interface JobDetail {
  id: string
  title: string
  type: string
  location: string
  department: string
  about: string
  responsibilities: string[]
  requirements: string[]
}

const JOBS: Record<string, JobDetail> = {
  'frontend-engineer-intern': {
    id: 'frontend-engineer-intern',
    title: 'Frontend Engineer Intern',
    type: 'Internship',
    location: 'Remote (Global)',
    department: 'Engineering',
    about: 'At Aniflixx, we\'re reinventing anime distribution—one pixel at a time. As a Frontend Engineer Intern, you\'ll collaborate with founders and designers to build the future of anime streaming.',
    responsibilities: [
      'Build responsive React components with Tailwind CSS',
      'Implement animations & interactions using Framer Motion',
      'Translate designs into pixel-perfect UIs',
      'Participate in code reviews and UX sessions'
    ],
    requirements: [
      'Basic React & JavaScript knowledge',
      'Familiarity with CSS or Tailwind',
      'Passion for anime and good design',
      'Portfolio or sample project (GitHub is fine)'
    ]
  },
  'backend-engineer-intern': {
    id: 'backend-engineer-intern',
    title: 'Backend Engineer Intern',
    type: 'Internship',
    location: 'Remote (Global)',
    department: 'Engineering',
    about: 'Aniflixx needs a strong backend to power millions of anime streams. As a Backend Engineer Intern, you\'ll help build the infrastructure that delivers anime to fans worldwide.',
    responsibilities: [
      'Design and build RESTful APIs (Node.js/Express)',
      'Manage and optimize NoSQL databases (Firebase/MongoDB)',
      'Implement authentication and security best practices',
      'Collaborate with frontend to ensure smooth data flow'
    ],
    requirements: [
      'Basic Node.js or Python skills',
      'Comfort with databases (any flavor)',
      'Willingness to learn cloud infra (Firebase/AWS)',
      'Strong problem-solving mindset'
    ]
  },
  'community-growth-intern': {
    id: 'community-growth-intern',
    title: 'Community & Growth Intern',
    type: 'Internship',
    location: 'Remote (Global)',
    department: 'Marketing',
    about: 'Community is the heart of anime fandom. As a Community & Growth Intern, you\'ll help build and nurture our global community of anime fans and creators.',
    responsibilities: [
      'Run social media campaigns on TikTok, Discord, X',
      'Engage with creators, moderators, and fans',
      'Track metrics and optimize engagement strategies',
      'Help organize online events and partnerships'
    ],
    requirements: [
      'Active in anime communities online',
      'Basic social media management skills',
      'Creative storytelling & meme sense',
      'Analytical approach to growth'
    ]
  }
}

export default function JobDetailsPage({ 
  params 
}: { 
  params: Promise<{ jobId: string }> 
}) {
  const resolvedParams = use(params)
  const job = JOBS[resolvedParams.jobId]
  
  if (!job) {
    notFound()
  }
  
  return (
    <div className="min-h-screen bg-white">
      {/* Subtle gradient background with animation */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-white to-gray-50 -z-10 animate-gradient-x"></div>
      
      {/* Simple Back Button */}
      <div className="sticky top-4 z-50 flex justify-start pt-4 px-6">
        <Link 
          href="/careers" 
          className="flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="text-sm font-medium text-gray-700">Back to Careers</span>
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Job Header */}
        <div className="relative bg-white rounded-xl shadow-lg p-8 mb-8 border border-gray-100 overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full blur-3xl opacity-50"></div>
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full blur-3xl opacity-50"></div>
          
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 rounded-full text-sm font-medium">
                {job.type}
              </span>
              <span className="flex items-center text-sm text-gray-600">
                <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {job.department}
              </span>
              <span className="flex items-center text-sm text-gray-600">
                <svg className="w-4 h-4 mr-1 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {job.location}
              </span>
            </div>
            
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{job.title}</h1>
          </div>
        </div>

        <div className="space-y-8">
          {/* About Section */}
          <div className="group relative">
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur opacity-0 group-hover:opacity-20 transition duration-500"></div>
            <div className="relative bg-white p-8 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About the Role</h2>
              <p className="text-gray-700 text-lg leading-relaxed">{job.about}</p>
            </div>
          </div>

          {/* Responsibilities Section */}
          <div className="group relative">
            <div className="absolute -inset-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg blur opacity-0 group-hover:opacity-20 transition duration-500"></div>
            <div className="relative bg-white p-8 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">What You'll Do</h2>
              <ul className="space-y-4">
                {job.responsibilities.map((item, index) => (
                  <li key={index} className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mt-1">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="ml-4 text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Requirements Section */}
          <div className="group relative">
            <div className="absolute -inset-2 bg-gradient-to-r from-pink-500 to-orange-500 rounded-lg blur opacity-0 group-hover:opacity-20 transition duration-500"></div>
            <div className="relative bg-white p-8 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">What We're Looking For</h2>
              <ul className="space-y-4">
                {job.requirements.map((item, index) => (
                  <li key={index} className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full flex items-center justify-center mt-1">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="ml-4 text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Apply Section */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-center relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-white mb-4">Ready to Apply?</h2>
              <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
                Send your resume and a brief note about why you're interested to our careers team:
              </p>
              <a 
                href={`mailto:careers@aniflixx.com?subject=Application for ${job.title}`}
                className="inline-block px-8 py-4 text-base font-semibold text-gray-900 bg-white rounded-full hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg"
              >
                Apply Now
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Simple Footer */}
      <footer className="py-8 px-6 bg-white border-t border-gray-100 mt-16">
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
        
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 15s ease infinite;
        }
      `}</style>
    </div>
  )
}