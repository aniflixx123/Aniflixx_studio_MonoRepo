// app/terms/page.tsx
'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState('')

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('section[id]')
      const scrollPosition = window.scrollY + 100

      sections.forEach((section) => {
        const sectionTop = (section as HTMLElement).offsetTop
        const sectionHeight = (section as HTMLElement).offsetHeight
        const sectionId = section.getAttribute('id') || ''

        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
          setActiveSection(sectionId)
        }
      })
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const sections = [
    { id: 'acceptance', title: '1. Acceptance of Terms' },
    { id: 'services', title: '2. Description of Services' },
    { id: 'accounts', title: '3. User Accounts' },
    { id: 'content', title: '4. Content Guidelines' },
    { id: 'intellectual', title: '5. Intellectual Property' },
    { id: 'privacy', title: '6. Privacy Policy' },
    { id: 'payment', title: '7. Payment Terms' },
    { id: 'termination', title: '8. Termination' },
    { id: 'liability', title: '9. Limitation of Liability' },
    { id: 'changes', title: '10. Changes to Terms' },
  ]

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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Table of Contents</h3>
              <nav className="space-y-2">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className={`block px-3 py-2 text-sm rounded-lg transition-all ${
                      activeSection === section.id
                        ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {section.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Terms Content */}
          <main className="lg:col-span-3">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-8">
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full text-sm font-medium text-gray-800 mb-6">
                <span className="flex h-3 w-3 mr-2">
                  <span className="relative h-3 w-3 rounded-full bg-blue-500"></span>
                </span>
                Last Updated: January 1, 2025
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Terms of Service
              </h1>
              
              <p className="text-lg text-gray-600">
                Welcome to Aniflixx. These terms and conditions outline the rules and regulations for the use of our platform, including both the mobile application and studio dashboard.
              </p>
            </div>

            {/* Terms Sections */}
            <div className="space-y-8">
              <section id="acceptance" className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
                <p className="text-gray-600 mb-4">
                  By accessing or using the Aniflixx platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, you may not access the Service.
                </p>
                <p className="text-gray-600">
                  These Terms apply to all visitors, users, studios, and others who access or use the Service. We reserve the right to update and change these Terms by posting updates and changes to the Aniflixx website.
                </p>
              </section>

              <section id="services" className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Description of Services</h2>
                <p className="text-gray-600 mb-4">
                  Aniflixx provides a comprehensive platform for anime and manga distribution, including:
                </p>
                <ul className="space-y-2 text-gray-600 ml-6">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Mobile application for fans to stream and engage with content
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Studio dashboard for content management and analytics
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Social features including Flicks, comments, and community engagement
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Direct monetization tools for content creators and studios
                  </li>
                </ul>
              </section>

              <section id="accounts" className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">3. User Accounts</h2>
                <div className="space-y-4 text-gray-600">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">3.1 Account Creation</h3>
                    <p>
                      To access certain features of the Service, you must register for an account. When you register, you agree to provide accurate, current, and complete information about yourself.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">3.2 Account Security</h3>
                    <p>
                      You are responsible for safeguarding the password and for any activities or actions under your account. You agree not to disclose your password to any third party.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">3.3 Studio Accounts</h3>
                    <p>
                      Studio accounts are subject to additional terms, including verification requirements and content quality standards. Studios must provide valid business information and comply with all applicable laws.
                    </p>
                  </div>
                </div>
              </section>

              <section id="content" className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Content Guidelines</h2>
                <div className="space-y-4 text-gray-600">
                  <p>Users and studios agree not to upload, post, or transmit content that:</p>
                  <ul className="space-y-2 ml-6">
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2">•</span>
                      Infringes any intellectual property or other proprietary rights
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2">•</span>
                      Contains software viruses or malicious code
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2">•</span>
                      Is unlawful, threatening, abusive, or defamatory
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2">•</span>
                      Violates the privacy of others
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2">•</span>
                      Promotes illegal activities or violence
                    </li>
                  </ul>
                </div>
              </section>

              <section id="intellectual" className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Intellectual Property</h2>
                <div className="space-y-4 text-gray-600">
                  <p>
                    The Service and its original content, features, and functionality are and will remain the exclusive property of Aniflixx and its licensors. The Service is protected by copyright, trademark, and other laws.
                  </p>
                  <p>
                    Studios retain ownership of their content but grant Aniflixx a worldwide, non-exclusive, royalty-free license to use, reproduce, and distribute the content through our platform.
                  </p>
                </div>
              </section>

              <section id="privacy" className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Privacy Policy</h2>
                <p className="text-gray-600">
                  Your use of the Service is also governed by our Privacy Policy. Please review our Privacy Policy, which also governs the Site and informs users of our data collection practices.
                </p>
              </section>

              <section id="payment" className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Payment Terms</h2>
                <div className="space-y-4 text-gray-600">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">7.1 Subscription Fees</h3>
                    <p>
                      Some aspects of the Service may be provided for a fee. You will be charged in advance on a recurring basis ("Billing Cycle"). Billing cycles are set on a monthly or annual basis.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">7.2 Revenue Sharing</h3>
                    <p>
                      Studios participating in our monetization program agree to the revenue sharing terms outlined in the Studio Agreement. Standard revenue share is 70% to studios, 30% to Aniflixx.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">7.3 Refunds</h3>
                    <p>
                      Refunds are handled on a case-by-case basis. Please contact support@aniflixx.com for refund requests.
                    </p>
                  </div>
                </div>
              </section>

              <section id="termination" className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Termination</h2>
                <p className="text-gray-600 mb-4">
                  We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
                </p>
                <p className="text-gray-600">
                  Upon termination, your right to use the Service will cease immediately. If you wish to terminate your account, you may simply discontinue using the Service.
                </p>
              </section>

              <section id="liability" className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Limitation of Liability</h2>
                <p className="text-gray-600">
                  In no event shall Aniflixx, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
                </p>
              </section>

              <section id="changes" className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Changes to Terms</h2>
                <p className="text-gray-600">
                  We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days notice prior to any new terms taking effect.
                </p>
              </section>

              {/* Contact Section */}
              <section className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-8 text-white">
                <h2 className="text-2xl font-bold mb-4">Questions About Our Terms?</h2>
                <p className="mb-6">
                  If you have any questions about these Terms of Service, please contact us.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link 
                    href="/contact"
                    className="inline-flex items-center justify-center px-6 py-3 bg-white text-gray-900 rounded-full font-semibold hover:bg-gray-100 transition-colors"
                  >
                    Contact Support
                  </Link>
                  <a 
                    href="mailto:legal@aniflixx.com"
                    className="inline-flex items-center justify-center px-6 py-3 border-2 border-white text-white rounded-full font-semibold hover:bg-white hover:text-gray-900 transition-colors"
                  >
                    Email Legal Team
                  </a>
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-20 border-t border-gray-200 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-600">
              © 2025 Aniflixx. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/privacy" className="text-sm text-gray-600 hover:text-gray-900">Privacy Policy</Link>
              <Link href="/documentation" className="text-sm text-gray-600 hover:text-gray-900">Documentation</Link>
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