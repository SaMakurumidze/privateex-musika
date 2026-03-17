import { type NextRequest, NextResponse } from "next/server"
import { createSQLClient } from "@/lib/db"
import bcrypt from "bcryptjs"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()


    const {
      full_name,
      email,
      password,
      confirm_password,
      id_passport,
      phone,
      country,
      address,
      profile_picture_url,
    } = body

    // Required field validation
    if (!full_name || !email || !password || !confirm_password || !id_passport || !phone || !country) {
      const missingFields = []
      if (!full_name) missingFields.push("full_name")
      if (!email) missingFields.push("email")
      if (!password) missingFields.push("password")
      if (!confirm_password) missingFields.push("confirm_password")
      if (!id_passport) missingFields.push("id_passport")
      if (!phone) missingFields.push("phone")
      if (!country) missingFields.push("country")
      return NextResponse.json({ error: `Please fill in all required fields: ${missingFields.join(", ")}` }, { status: 400 })
    }

    // Full name validation (at least 2 words for proper identification)
    const nameParts = full_name.trim().split(/\s+/)
    if (nameParts.length < 2) {
      return NextResponse.json({ error: "Please enter your full name (first and last name)" }, { status: 400 })
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 })
    }

    // Password length validation
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 })
    }

    // Password match validation
    if (password !== confirm_password) {
      return NextResponse.json({ error: "Passwords do not match" }, { status: 400 })
    }

    // ID/Passport validation (alphanumeric, 6-20 characters)
    const idPassportRegex = /^[A-Za-z0-9-]{6,20}$/
    if (!idPassportRegex.test(id_passport)) {
      return NextResponse.json(
        { error: "Invalid ID/Passport number. Must be 6-20 alphanumeric characters." },
        { status: 400 }
      )
    }

    // Phone number validation (basic international format)
    const phoneRegex = /^\+?[0-9]{7,15}$/
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, "")
    if (!phoneRegex.test(cleanPhone)) {
      return NextResponse.json(
        { error: "Invalid phone number. Please enter a valid phone number with country code." },
        { status: 400 }
      )
    }

    // Create SQL client after all validations pass
    const sql = createSQLClient()

    // Check if email already exists
    const existingEmail = await sql`
      SELECT id FROM investors WHERE email = ${email}
    `

    if (existingEmail.length > 0) {
      return NextResponse.json({ error: "Email address already registered" }, { status: 400 })
    }

    // Check if ID/Passport already exists
    const existingIdPassport = await sql`
      SELECT id FROM investors WHERE id_passport = ${id_passport}
    `

    if (existingIdPassport.length > 0) {
      return NextResponse.json({ error: "ID/Passport number already registered" }, { status: 400 })
    }

    // Hash password and generate verification token
    const hashedPassword = await bcrypt.hash(password, 10)
    const profilePicUrl = profile_picture_url || null
    const verificationToken = crypto.randomBytes(32).toString("hex")
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    const result = await sql`
      INSERT INTO investors (
        full_name, 
        email, 
        password, 
        id_passport, 
        phone, 
        country, 
        address,
        role,
        profile_picture_url,
        email_verified,
        email_verification_token,
        token_expires
      )
      VALUES (
        ${full_name}, 
        ${email}, 
        ${hashedPassword}, 
        ${id_passport}, 
        ${cleanPhone}, 
        ${country}, 
        ${address || null},
        'Angel Investor',
        ${profilePicUrl},
        FALSE,
        ${verificationToken},
        ${tokenExpires}
      )
      RETURNING id
    `

    const investorId = result[0]?.id

    // Create wallet for new investor with $10,000 default balance
    if (investorId) {
      await sql`
        INSERT INTO wallets (investor_id, balance)
        VALUES (${investorId}, 10000.00)
      `
    }

    // Send verification email
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : "http://localhost:3000"
    const verificationLink = `${baseUrl}/verify-email?token=${verificationToken}`
    
    // Log verification link for development (in production, send actual email)
    console.log(`[Email Verification] Send to: ${email}`)
    console.log(`[Email Verification] Link: ${verificationLink}`)

    // TODO: Integrate with email service (e.g., Resend, SendGrid)
    // For now, we'll just log the link and show it in the response for testing

    return NextResponse.json({
      success: true,
      message: "Account created successfully! Please check your email to verify your account before logging in.",
      investorId: investorId,
      // Include verification link in development for testing
      ...(process.env.NODE_ENV === "development" && { verificationLink })
    })
  } catch (error: unknown) {
    // Check for specific database constraint errors
    const dbError = error as { code?: string; constraint?: string; detail?: string; message?: string }
    
    if (dbError.code === "23505") {
      // Unique constraint violation
      if (dbError.constraint?.includes("email")) {
        return NextResponse.json({ error: "Email address already registered" }, { status: 400 })
      }
      if (dbError.constraint?.includes("id_passport")) {
        return NextResponse.json({ error: "ID/Passport number already registered" }, { status: 400 })
      }
      return NextResponse.json({ error: "An account with these details already exists" }, { status: 400 })
    }
    
    if (dbError.code === "23502") {
      // NOT NULL constraint violation
      return NextResponse.json({ error: "Missing required field. Please fill in all fields." }, { status: 400 })
    }
    
    // Log unexpected errors for debugging
    console.error("Registration error:", dbError.message || error)
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 })
  }
}
