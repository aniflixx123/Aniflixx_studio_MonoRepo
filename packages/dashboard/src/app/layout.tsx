// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'
import { dark } from '@clerk/themes'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AniFlixx Studio',
  description: 'Premium Content Management Platform',
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
        <body className={`${inter.className} bg-[#0a0a0f] text-white antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}