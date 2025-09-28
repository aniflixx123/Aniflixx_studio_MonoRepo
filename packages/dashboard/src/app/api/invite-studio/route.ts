import { auth } from '@clerk/nextjs/server'
import { clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Replace with your actual Clerk user ID(s)
const ALLOWED_ADMINS = [
  'user_33JCkRttdAaSGCwF2sgFZd6wev9',  // Replace with your actual user ID
  // Add more admin IDs here if needed
]

export async function POST(request: Request) {
  try {
    // Check authentication
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      )
    }

    // Check if user is admin
    if (!ALLOWED_ADMINS.includes(userId)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' }, 
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { email, studioName }:any = body

    // Validate input
    if (!email || !studioName) {
      return NextResponse.json(
        { error: 'Email and studio name are required' }, 
        { status: 400 }
      )
    }

    // Generate a temporary password
    const tempPassword = `Studio${Math.random().toString(36).slice(2, 10)}!@#`
    
    // Create user in Clerk
    const client = await clerkClient()
    
    // Check if user already exists
    const existingUsers = await client.users.getUserList({
      emailAddress: [email]
    })

    if (existingUsers.data.length > 0) {
      return NextResponse.json(
        { error: 'A user with this email already exists' }, 
        { status: 400 }
      )
    }

    // Create new user
    const user = await client.users.createUser({
      emailAddress: [email],
      password: tempPassword,
      firstName: studioName,
    })
    
    // Create organization for the studio
    const org = await client.organizations.createOrganization({
      name: studioName,
      createdBy: user.id,
    })
    
    // Add user to organization as admin
    await client.organizations.createOrganizationMembership({
      organizationId: org.id,
      userId: user.id,
      role: 'org:admin'
    })

    // Log the action for audit
    console.log(`[ADMIN ACTION] User ${userId} created studio:`, {
      studioName,
      email,
      newUserId: user.id,
      orgId: org.id,
      timestamp: new Date().toISOString()
    })
    
    return NextResponse.json({ 
      success: true, 
      tempPassword,
      userId: user.id,
      orgId: org.id,
      message: `Studio "${studioName}" created successfully`
    })

  } catch (error: any) {
    console.error('[ADMIN ERROR] Failed to create studio:', error)
    
    // Handle Clerk-specific errors
    if (error.errors && error.errors.length > 0) {
      const clerkError = error.errors[0]
      return NextResponse.json(
        { 
          success: false, 
          error: clerkError.message || 'Failed to create studio'
        }, 
        { status: 400 }
      )
    }
    
    // Generic error
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'An unexpected error occurred' 
      }, 
      { status: 500 }
    )
  }
}

// Optional: Add GET method to check if current user is admin
export async function GET() {
  const { userId } = await auth()
  
  if (!userId) {
    return NextResponse.json({ isAdmin: false })
  }
  
  return NextResponse.json({ 
    isAdmin: ALLOWED_ADMINS.includes(userId),
    userId 
  })
}