import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-6">Aniflixx Studio Portal</h1>
        <p className="text-gray-600 mb-8">Sign in with your studio credentials</p>
        <SignIn 
          appearance={{
            elements: {
              footerAction: { display: 'none' }, // Hide sign-up link
            }
          }}
        />
      </div>
    </div>
  )
}