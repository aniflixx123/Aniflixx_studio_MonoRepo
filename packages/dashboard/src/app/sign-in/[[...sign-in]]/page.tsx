'use client'
import { SignIn } from '@clerk/nextjs'
import Link from 'next/link'
import Image from 'next/image'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Subtle gradient background with animation */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-white to-gray-50 -z-10 animate-gradient-x"></div>
      
      {/* Decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full blur-3xl opacity-70 animate-pulse-slow"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full blur-3xl opacity-70 animate-pulse-slow animation-delay-2000"></div>
      </div>

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

      {/* Main Content */}
      <div className="flex min-h-[calc(100vh-88px)] items-center justify-center px-6">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Side - Info */}
          <div className="hidden lg:block">
            <div className="max-w-lg">
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full text-sm font-medium text-gray-800 mb-6">
                <span className="flex h-3 w-3 mr-2">
                  <span className="animate-ping absolute h-3 w-3 rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative h-3 w-3 rounded-full bg-green-500"></span>
                </span>
                STUDIO DASHBOARD
              </div>
              
              <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
                Welcome back to your
                <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Studio Dashboard
                </span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-10">
                Manage your anime and manga content, track analytics, and connect with millions of fans worldwide.
              </p>
              
              <div className="space-y-6">
                <div className="group relative">
                  <div className="absolute -inset-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur opacity-0 group-hover:opacity-20 transition duration-500"></div>
                  <div className="relative bg-white p-6 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Content Management</h3>
                        <p className="text-gray-600">Upload and organize your anime episodes and manga chapters</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="group relative">
                  <div className="absolute -inset-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg blur opacity-0 group-hover:opacity-20 transition duration-500"></div>
                  <div className="relative bg-white p-6 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Real-time Analytics</h3>
                        <p className="text-gray-600">Track views, engagement, and revenue with AI insights</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="group relative">
                  <div className="absolute -inset-2 bg-gradient-to-r from-pink-500 to-orange-500 rounded-lg blur opacity-0 group-hover:opacity-20 transition duration-500"></div>
                  <div className="relative bg-white p-6 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-pink-500 to-orange-500 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Global Distribution</h3>
                        <p className="text-gray-600">Reach fans in 190+ countries with region controls</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-10 pt-8 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Don't have a studio account? 
                  <Link href="/contact" className="text-gray-900 font-medium hover:text-gray-700 ml-1">
                    Contact us for access
                  </Link>
                </p>
              </div>
            </div>
          </div>
          
          {/* Right Side - Sign In Form */}
          <div className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">
            <div className="group relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition duration-500"></div>
              <div className="relative bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    Sign in to Dashboard
                  </h2>
                  <p className="text-gray-600">
                    Enter your studio credentials to continue
                  </p>
                </div>
                
                <SignIn 
                  appearance={{
                    elements: {
                      rootBox: "w-full",
                      card: "shadow-none p-0",
                      headerTitle: "hidden",
                      headerSubtitle: "hidden",
                      socialButtonsBlockButton: "border-gray-300 hover:bg-gray-50",
                      dividerRow: "hidden",
                      formFieldLabel: "text-gray-700 font-medium",
                      formFieldInput: "border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent",
                      formButtonPrimary: "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg py-3 shadow-md",
                      footerAction: "hidden",
                      footerActionLink: "text-gray-600 hover:text-gray-900 font-medium",
                      identityPreviewText: "text-gray-700",
                      identityPreviewEditButtonIcon: "text-gray-500",
                      formFieldAction: "text-gray-600 hover:text-gray-900",
                      formFieldError: "text-red-600",
                      otpCodeFieldInput: "border-gray-300",
                      formResendCodeLink: "text-gray-600 hover:text-gray-900"
                    },
                    layout: {
                      socialButtonsPlacement: "bottom",
                      socialButtonsVariant: "blockButton"
                    }
                  }}
                  redirectUrl="/dashboard"
                  signUpUrl="/contact"
                />
                
                {/* Mobile-only info */}
                <div className="mt-6 lg:hidden">
                  <p className="text-xs text-center text-gray-500">
                    By signing in, you agree to our Terms of Service and Privacy Policy
                  </p>
                </div>
              </div>
            </div>
            
            {/* Security badges */}
            <div className="mt-6 flex items-center justify-center space-x-6 text-xs text-gray-500">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Secure login
              </div>
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                256-bit encryption
              </div>
            </div>
          </div>
        </div>
      </div>

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