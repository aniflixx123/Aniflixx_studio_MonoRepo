// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'
import { dark } from '@clerk/themes'

const inter = Inter({ subsets: ['latin'] })

// Google Analytics Measurement ID
const GA_MEASUREMENT_ID = 'G-CS5EFFCLQP'

export const metadata: Metadata = {
  title: {
    default: 'AniFlixx - Stream Anime, Manga & Webtoons',
    template: '%s | AniFlixx'
  },
  description: 'Watch the latest anime episodes, read manga chapters, and enjoy webtoons all in one premium streaming platform. HD quality, no ads, updated daily.',
  keywords: ['anime streaming', 'watch anime online', 'manga reader', 'webtoon platform', 'AniFlixx', 'anime episodes', 'manga chapters'],
  authors: [{ name: 'AniFlixx' }],
  creator: 'AniFlixx',
  publisher: 'AniFlixx',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://aniflixx.com'),
  openGraph: {
    title: 'AniFlixx - Your Premium Anime Streaming Platform',
    description: 'Stream HD anime, read manga, and enjoy webtoons. New episodes daily, no ads, premium experience.',
    url: 'https://aniflixx.com',
    siteName: 'AniFlixx',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'AniFlixx - Stream Anime & Manga',
      }
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AniFlixx - Stream Anime & Manga',
    description: 'Premium anime streaming, manga reading, and webtoons all in one place',
    images: ['/logo.png'],
    creator: '@aniflixx',
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  alternates: {
    canonical: 'https://aniflixx.com',
  },
  verification: {
    google: 'your-google-verification-code', // Update this with your actual verification code if you have one
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#a855f7',
          colorBackground: '#0a0a0f',
        },
        elements: {
          rootBox: 'bg-[#0a0a0f]',
          card: 'bg-[#1a1625] border-[#2a2435]',
        }
      }}
    >
      <html lang="en" className="dark">
        <head>
          {/* Google Analytics */}
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}', {
                page_path: window.location.pathname,
              });
            `}
          </Script>
          
          {/* Structured Data for SEO */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'WebSite',
                name: 'AniFlixx',
                url: 'https://aniflixx.com',
                description: 'Premium anime streaming and manga reading platform',
                potentialAction: {
                  '@type': 'SearchAction',
                  target: {
                    '@type': 'EntryPoint',
                    urlTemplate: 'https://aniflixx.com/search?q={search_term_string}'
                  },
                  'query-input': 'required name=search_term_string'
                }
              })
            }}
          />
        </head>
        <body className={`${inter.className} bg-[#0a0a0f] text-white antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}