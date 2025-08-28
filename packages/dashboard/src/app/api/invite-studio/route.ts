import { clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email: string; studioName: string }
    const { email, studioName } = body
    
    // Generate a temporary password
    const tempPassword = `Studio${Math.random().toString(36).slice(2, 10)}!@#`
    
    // Create user in Clerk
    const client = await clerkClient()
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
    
    // Add user to organization
    await client.organizations.createOrganizationMembership({
      organizationId: org.id,
      userId: user.id,
      role: 'org:admin'  // Changed from 'admin' to 'org:admin'
    })
    
    return NextResponse.json({ 
      success: true, 
      tempPassword,
      userId: user.id,
      orgId: org.id
    })
  } catch (error: any) {
    console.error('Full error:', error.errors || error)
    return NextResponse.json({ 
      success: false, 
      error: error.errors?.[0]?.message || error.message || 'Failed to create studio' 
    }, { status: 500 })
  }
}