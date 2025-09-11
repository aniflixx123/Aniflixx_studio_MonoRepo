// packages/dashboard/src/app/careers/[jobId]/page.tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'

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
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-gray-900">Aniflixx</Link>
            </div>
            <div className="flex items-center space-x-8">
              <Link href="/careers" className="text-gray-700 hover:text-gray-900">All Jobs</Link>
              <Link href="/sign-in" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                Studio Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Back Link */}
        <Link href="/careers" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-8">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to all jobs
        </Link>

        {/* Job Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{job.title}</h1>
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="flex items-center text-gray-600">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {job.department}
              </span>
              <span className="flex items-center text-gray-600">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {job.location}
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                {job.type}
              </span>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-3">About the Role</h2>
              <p className="text-gray-700">{job.about}</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-3">What You'll Do</h2>
              <ul className="space-y-2">
                {job.responsibilities.map((item, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-3">What We're Looking For</h2>
              <ul className="space-y-2">
                {job.requirements.map((item, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="w-5 h-5 text-blue-500 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Apply Section */}
        <div className="bg-blue-50 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">Ready to Apply?</h2>
          <p className="text-gray-700 mb-6">
            Send your resume and a brief note about why you're interested to:
          </p>
          <a 
            href={`mailto:careers@aniflixx.com?subject=Application for ${job.title}`}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 inline-block"
          >
            Apply Now
          </a>
        </div>
      </div>
    </div>
  )
}

// Add this import at the top of the file
import { use } from 'react'