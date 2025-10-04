'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'

// COMPLETE PRICING CONFIG WITH ALL CURRENCIES
const PRICING_CONFIG = {
  pro: {
    usd: { priceId: 'price_1S8FTDAoYPwNm8bkKDjYQWiL', amount: '4.99', currency: 'USD', symbol: '$' },
    cad: { priceId: 'price_1S8ua7AoYPwNm8bk3eOiRbJF', amount: '6.49', currency: 'CAD', symbol: 'C$' },
    mxn: { priceId: 'price_1S8uaJAoYPwNm8bk6ar0bcHJ', amount: '59', currency: 'MXN', symbol: '$' },
    brl: { priceId: 'price_1S8FTsAoYPwNm8bkwRNXZkUh', amount: '9.90', currency: 'BRL', symbol: 'R$' },
    eur: { priceId: 'price_1S8uZfAoYPwNm8bkYLSlQJU1', amount: '3.99', currency: 'EUR', symbol: '€' },
    gbp: { priceId: 'price_1S8uZmAoYPwNm8bktzRXuI99', amount: '3.49', currency: 'GBP', symbol: '£' },
    inr: { priceId: 'price_1S8FTXAoYPwNm8bkDEEWT73z', amount: '99', currency: 'INR', symbol: '₹' },
    idr: { priceId: 'price_1S8uXtAoYPwNm8bk2TGHigc4', amount: '75,000', currency: 'IDR', symbol: 'Rp' },
    php: { priceId: 'price_1S8uY3AoYPwNm8bkcJ506kPe', amount: '99', currency: 'PHP', symbol: '₱' },
    thb: { priceId: 'price_1S8uY9AoYPwNm8bkiC8C3NhK', amount: '69', currency: 'THB', symbol: '฿' },
    vnd: { priceId: 'price_1S8uaWAoYPwNm8bkrt73rGwd', amount: '120,000', currency: 'VND', symbol: '₫' },
    myr: { priceId: 'price_1S8uadAoYPwNm8bk7wts6fkT', amount: '9', currency: 'MYR', symbol: 'RM' },
    sgd: { priceId: 'price_1S8uawAoYPwNm8bkPPOORMcW', amount: '5.99', currency: 'SGD', symbol: 'S$' },
    jpy: { priceId: 'price_1S8uZuAoYPwNm8bkZkaZo7pZ', amount: '500', currency: 'JPY', symbol: '¥' },
    aud: { priceId: 'price_1S8ua0AoYPwNm8bkwvw7Gosp', amount: '6.99', currency: 'AUD', symbol: 'A$' },
  },
  max: {
    usd: { priceId: 'price_1S8FTKAoYPwNm8bkxHN5YvKh', amount: '7.99', currency: 'USD', symbol: '$' },
    cad: { priceId: 'price_1SApXjAoYPwNm8bkie4fct2z', amount: '10.39', currency: 'CAD', symbol: 'C$' },
    mxn: { priceId: 'price_1SApXpAoYPwNm8bkhQzx2MlC', amount: '95', currency: 'MXN', symbol: '$' },
    brl: { priceId: 'price_1S8FTxAoYPwNm8bkjFbi1B82', amount: '14.90', currency: 'BRL', symbol: 'R$' },
    eur: { priceId: 'price_1SApXuAoYPwNm8bkVlfZ8GrM', amount: '6.39', currency: 'EUR', symbol: '€' },
    gbp: { priceId: 'price_1SApY2AoYPwNm8bkHg1fJQOx', amount: '5.59', currency: 'GBP', symbol: '£' },
    inr: { priceId: 'price_1S8FTcAoYPwNm8bk3Wn5Qz7l', amount: '149', currency: 'INR', symbol: '₹' },
    idr: { priceId: 'price_1S8uYHAoYPwNm8bk3hI0ZtnZ', amount: '120,000', currency: 'IDR', symbol: 'Rp' },
    php: { priceId: 'price_1S8uZPAoYPwNm8bkXmhOTEIi', amount: '149', currency: 'PHP', symbol: '₱' },
    thb: { priceId: 'price_1S8uZZAoYPwNm8bkT2QisCnR', amount: '99', currency: 'THB', symbol: '฿' },
    vnd: { priceId: 'price_1SApY6AoYPwNm8bkVCWF1RZX', amount: '195,000', currency: 'VND', symbol: '₫' },
    myr: { priceId: 'price_1SApYBAoYPwNm8bkImk7w8hF', amount: '15', currency: 'MYR', symbol: 'RM' },
    sgd: { priceId: 'price_1SApYGAoYPwNm8bkQVYtVmy8', amount: '9.59', currency: 'SGD', symbol: 'S$' },
    jpy: { priceId: 'price_1SApYNAoYPwNm8bkJt3PzwkU', amount: '800', currency: 'JPY', symbol: '¥' },
    aud: { priceId: 'price_1SApYSAoYPwNm8bkC2GpzSLZ', amount: '11.19', currency: 'AUD', symbol: 'A$' },
  },
  creator_pro: {
    usd: { priceId: 'price_1S8FTQAoYPwNm8bkZjbYb42N', amount: '12.99', currency: 'USD', symbol: '$' },
    cad: { priceId: 'price_1SApYYAoYPwNm8bkHpMqIe2C', amount: '16.89', currency: 'CAD', symbol: 'C$' },
    mxn: { priceId: 'price_1SApYfAoYPwNm8bkT89ZVjgz', amount: '154', currency: 'MXN', symbol: '$' },
    brl: { priceId: 'price_1S8FU4AoYPwNm8bkODhjMn0a', amount: '24.90', currency: 'BRL', symbol: 'R$' },
    eur: { priceId: 'price_1SApYlAoYPwNm8bkn7ondUFI', amount: '10.39', currency: 'EUR', symbol: '€' },
    gbp: { priceId: 'price_1SApYrAoYPwNm8bkuCK9OXyi', amount: '9.09', currency: 'GBP', symbol: '£' },
    inr: { priceId: 'price_1S8FTiAoYPwNm8bkcsChLQHx', amount: '249', currency: 'INR', symbol: '₹' },
    idr: { priceId: 'price_1SApYzAoYPwNm8bkcY0M5tA0', amount: '195,000', currency: 'IDR', symbol: 'Rp' },
    php: { priceId: 'price_1SApZ9AoYPwNm8bkv56LhPBk', amount: '259', currency: 'PHP', symbol: '₱' },
    thb: { priceId: 'price_1SApZKAoYPwNm8bkly3rLDEn', amount: '179', currency: 'THB', symbol: '฿' },
    vnd: { priceId: 'price_1SApZRAoYPwNm8bkmIaxiz0z', amount: '320,000', currency: 'VND', symbol: '₫' },
    myr: { priceId: 'price_1SApZbAoYPwNm8bk6X2nrHKp', amount: '24', currency: 'MYR', symbol: 'RM' },
    sgd: { priceId: 'price_1SApZiAoYPwNm8bkfdQzOOvT', amount: '15.59', currency: 'SGD', symbol: 'S$' },
    jpy: { priceId: 'price_1SApZvAoYPwNm8bkszGx6AIL', amount: '1,300', currency: 'JPY', symbol: '¥' },
    aud: { priceId: 'price_1SApa2AoYPwNm8bkvZCKSBOv', amount: '18.19', currency: 'AUD', symbol: 'A$' },
  }
}

function BillingContent() {
  const searchParams = useSearchParams()
  const session = searchParams.get('session')
  const [loading, setLoading] = useState(true)
  const [sessionData, setSessionData] = useState<any>(null)
  const [currency, setCurrency] = useState('usd')
  const [userCountry, setUserCountry] = useState('')

  useEffect(() => {
    detectUserLocation()
    if (session) {
      validateSession()
    } else {
      setLoading(false)
    }
  }, [session])

  const detectUserLocation = async () => {
    try {
      const res = await fetch('https://ipapi.co/json/')
      const data:any = await res.json()
      
      const countryToCurrency: Record<string, string> = {
        'IN': 'inr', 'US': 'usd', 'CA': 'cad', 'MX': 'mxn',
        'BR': 'brl', 'GB': 'gbp', 'DE': 'eur', 'FR': 'eur',
        'ES': 'eur', 'IT': 'eur', 'JP': 'jpy', 'ID': 'idr',
        'PH': 'php', 'TH': 'thb', 'VN': 'vnd', 'MY': 'myr',
        'SG': 'sgd', 'AU': 'aud', 'NL': 'eur', 'BE': 'eur',
        'PT': 'eur', 'IE': 'eur', 'AT': 'eur', 'FI': 'eur'
      }
      
      const detectedCurrency = countryToCurrency[data.country_code] || 'usd'
      setCurrency(detectedCurrency)
      setUserCountry(data.country_name || '')
      
    } catch (error) {
      console.error('Location detection failed:', error)
      setCurrency('usd')
    }
  }

  const validateSession = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/payments/checkout/validate-session?session=${session}`)
      const data:any = await res.json()
      
      if (data.success) {
        setSessionData(data)
      } else {
        window.location.href = '/subscription/invalid'
      }
    } catch (error) {
      console.error('Session validation failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckout = async (plan: 'pro' | 'max' | 'creator_pro') => {
    if (!session) {
      alert('No valid session. Please return to the app and try again.')
      return
    }
    
    setLoading(true)
    const priceInfo = PRICING_CONFIG[plan][currency as keyof typeof PRICING_CONFIG['pro']]
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/payments/checkout/create-stripe-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_token: session,
          price_id: priceInfo.priceId
        })
      })

      const data:any = await res.json()
      if (data.success && data.stripe_url) {
        window.location.href = data.stripe_url
      } else {
        alert('Failed to create checkout session. Please try again.')
        setLoading(false)
      }
    } catch (error) {
      console.error('Checkout failed:', error)
      alert('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  const proPricing = PRICING_CONFIG.pro[currency as keyof typeof PRICING_CONFIG.pro] || PRICING_CONFIG.pro.usd
  const maxPricing = PRICING_CONFIG.max[currency as keyof typeof PRICING_CONFIG.max] || PRICING_CONFIG.max.usd
  const creatorPricing = PRICING_CONFIG.creator_pro[currency as keyof typeof PRICING_CONFIG.creator_pro] || PRICING_CONFIG.creator_pro.usd

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white mx-auto"></div>
          <p className="mt-4 text-white text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600">
        <div className="text-center bg-white rounded-lg p-8 shadow-2xl max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-4">No Session Found</h1>
          <p className="text-gray-600 mb-6">
            Please open this page from the Aniflixx app to complete your subscription.
          </p>
          <a 
            href="https://aniflixx.com"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold"
          >
            Go to Aniflixx
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Choose Your Plan</h1>
          {userCountry && (
            <p className="text-white/80 mb-2">
              Detected location: {userCountry}
            </p>
          )}
          <p className="text-white/90 text-lg">
            Prices shown in {proPricing.currency}
          </p>
          
          {/* Currency Selector */}
          <div className="mt-4">
            <select 
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="px-4 py-2 rounded-lg bg-white/20 text-white border border-white/30 backdrop-blur"
            >
              <option value="usd" className="text-black">🇺🇸 USD - US Dollar</option>
              <option value="inr" className="text-black">🇮🇳 INR - Indian Rupee</option>
              <option value="brl" className="text-black">🇧🇷 BRL - Brazilian Real</option>
              <option value="eur" className="text-black">🇪🇺 EUR - Euro</option>
              <option value="gbp" className="text-black">🇬🇧 GBP - British Pound</option>
              <option value="jpy" className="text-black">🇯🇵 JPY - Japanese Yen</option>
              <option value="idr" className="text-black">🇮🇩 IDR - Indonesian Rupiah</option>
              <option value="php" className="text-black">🇵🇭 PHP - Philippine Peso</option>
              <option value="thb" className="text-black">🇹🇭 THB - Thai Baht</option>
              <option value="vnd" className="text-black">🇻🇳 VND - Vietnamese Dong</option>
              <option value="myr" className="text-black">🇲🇾 MYR - Malaysian Ringgit</option>
              <option value="sgd" className="text-black">🇸🇬 SGD - Singapore Dollar</option>
              <option value="aud" className="text-black">🇦🇺 AUD - Australian Dollar</option>
              <option value="cad" className="text-black">🇨🇦 CAD - Canadian Dollar</option>
              <option value="mxn" className="text-black">🇲🇽 MXN - Mexican Peso</option>
            </select>
          </div>
        </div>

        {/* User Info */}
        {sessionData && (
          <div className="bg-white/10 backdrop-blur rounded-lg p-4 mb-6 max-w-md mx-auto">
            <p className="text-white text-sm">Subscribing as:</p>
            <p className="text-white font-semibold">{sessionData.user.email}</p>
            <p className="text-white/70 text-xs mt-1">@{sessionData.user.username}</p>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* PRO Plan */}
          <div className="bg-white rounded-2xl shadow-xl p-6 transform hover:scale-105 transition-transform">
            <h2 className="text-xl font-bold mb-2">PRO</h2>
            <div className="text-4xl font-bold mb-4 text-blue-600">
              {proPricing.symbol}{proPricing.amount}
              <span className="text-sm font-normal text-gray-600">/month</span>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-sm">HD streaming up to 1080p</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-sm">No ads</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-sm">Access to seasonal anime</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-sm">Create up to 5 watchlists</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-sm">Basic community features</span>
              </li>
            </ul>
            <button
              onClick={() => handleCheckout('pro')}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Processing...' : 'Select PRO'}
            </button>
          </div>

          {/* MAX Plan */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-purple-500 relative transform hover:scale-105 transition-transform">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-purple-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                MOST POPULAR
              </span>
            </div>
            <h2 className="text-xl font-bold mb-2 mt-2">MAX</h2>
            <div className="text-4xl font-bold mb-4 text-purple-600">
              {maxPricing.symbol}{maxPricing.amount}
              <span className="text-sm font-normal text-gray-600">/month</span>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-sm font-semibold">4K streaming</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-sm">No ads</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-sm font-semibold">Offline downloads (25 episodes)</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-sm font-semibold">Simulcast access</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-sm">Early access to new episodes</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-sm">Unlimited watchlists</span>
              </li>
            </ul>
            <button
              onClick={() => handleCheckout('max')}
              disabled={loading}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Processing...' : 'Select MAX'}
            </button>
          </div>

          {/* CREATOR PRO Plan */}
          <div className="bg-white rounded-2xl shadow-xl p-6 transform hover:scale-105 transition-transform">
            <h2 className="text-xl font-bold mb-2">CREATOR PRO</h2>
            <div className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              {creatorPricing.symbol}{creatorPricing.amount}
              <span className="text-sm font-normal text-gray-600">/month</span>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-sm font-semibold">All MAX features</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-sm font-semibold">Creator dashboard</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-sm">Upload and monetize content</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-sm">Verified creator badge</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-sm font-semibold">Revenue sharing program</span>
              </li>
            </ul>
            <button
              onClick={() => handleCheckout('creator_pro')}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? 'Processing...' : 'Select CREATOR PRO'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-white/80">
          <div className="mb-4">
            <img src="/stripe-badge.png" alt="Powered by Stripe" className="h-8 mx-auto opacity-80" />
          </div>
          <p className="text-sm">Secure payment powered by Stripe</p>
          <p className="text-sm mt-2">Cancel anytime from your account settings</p>
          <p className="text-xs mt-4 text-white/60">
            By subscribing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white mx-auto"></div>
          <p className="mt-4 text-white text-lg">Loading...</p>
        </div>
      </div>
    }>
      <BillingContent />
    </Suspense>
  )
}