import { type NextRequest, NextResponse } from "next/server"
import { createSQLClient } from "@/lib/db"
import bcrypt from "bcryptjs"
import crypto from "crypto"

function isStrongPassword(password: string) {
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSpecial = /[^A-Za-z0-9\s]/.test(password)
  return hasUppercase && hasLowercase && hasNumber && hasSpecial
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()


    const {
      full_name,
      email: rawEmail,
      password,
      confirm_password,
      profile_picture_url,
    } = body
    const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : ""

    const normalizedFullName = typeof full_name === "string" ? full_name.trim() : ""
    const placeholderIdPassport = `PENDING-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`

    // Required field validation
    if (!normalizedFullName || !email || !password || !confirm_password) {
      const missingFields = []
      if (!normalizedFullName) missingFields.push("full_name")
      if (!email) missingFields.push("email")
      if (!password) missingFields.push("password")
      if (!confirm_password) missingFields.push("confirm_password")
      return NextResponse.json({ error: `Please fill in all required fields: ${missingFields.join(", ")}` }, { status: 400 })
    }

    // Full name validation (at least 2 words for proper identification)
    const nameParts = normalizedFullName.split(/\s+/)
    if (nameParts.length < 2) {
      return NextResponse.json({ error: "Please enter your full name (first and last name)" }, { status: 400 })
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 })
    }

    // Password length validation
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 })
    }

    if (!isStrongPassword(password)) {
      return NextResponse.json(
        {
          error:
            "Password must include at least one uppercase letter, one lowercase letter, one number, and one special character.",
        },
        { status: 400 },
      )
    }

    // Password match validation
    if (password !== confirm_password) {
      return NextResponse.json({ error: "Passwords do not match" }, { status: 400 })
    }

    // Create SQL client after all validations pass
    const sql = createSQLClient()

    // Backward-compatible schema guard for older production databases.
    await sql`
      ALTER TABLE investors
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE
    `
    await sql`
      ALTER TABLE investors
      ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255)
    `
    await sql`
      ALTER TABLE investors
      ADD COLUMN IF NOT EXISTS token_expires TIMESTAMP
    `
    await sql`
      ALTER TABLE investors
      ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255)
    `
    await sql`
      ALTER TABLE investors
      ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP
    `

    // Check if email already exists
    const existingEmail = await sql`
      SELECT id FROM investors WHERE LOWER(email) = LOWER(${email})
    `

    if (existingEmail.length > 0) {
      return NextResponse.json({ error: "Email address already registered" }, { status: 400 })
    }

    // Hash password and generate verification token
    const hashedPassword = await bcrypt.hash(password, 10)
    // Some existing deployments have stricter NOT NULL constraints on profile/contact columns.
    // Store empty strings instead of NULL so registration remains backward-compatible.
    const profilePicUrl = typeof profile_picture_url === "string" ? profile_picture_url.trim() : ""
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
        ${normalizedFullName}, 
        ${email}, 
        ${hashedPassword}, 
        ${placeholderIdPassport},
        ${""},
        ${""},
        ${""},
        'Angel Investor',
        ${profilePicUrl},
        FALSE,
        ${verificationToken},
        ${tokenExpires}
      )
      RETURNING id
    `

    const investorId = result[0]?.id

    if (!investorId) {
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 })
    }

    // Create wallet for new investor with $10,000 default balance
    await sql`
      INSERT INTO wallets (investor_id, balance)
      VALUES (${investorId}, 10000.00)
    `

    await sql`
      CREATE TABLE IF NOT EXISTS investor_messages (
        id SERIAL PRIMARY KEY,
        investor_id INTEGER NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
        subject VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `

    await sql`
      INSERT INTO investor_messages (investor_id, subject, body)
      VALUES (
        ${investorId},
        'Welcome to PrivateEx. Global',
        ${`Hi there,

Thank you for registering an account with PrivateEx.

I hope your experience is intuitive, educative, informative, and above all exciting.

If your experience is on the contrary, I would love to know everything about it so we can improve the final build.

You can contact me via WhatsApp on +263787182187 or +263773414710.

Bye for now!

PrivateEx. Team`}
      )
    `

    // Send verification email
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
    const verificationLink = `${baseUrl}/verify-email?token=${verificationToken}`
    
    // Log verification link for development (in production, send actual email)
    console.log(`[Email Verification] Send to: ${email}`)
    console.log(`[Email Verification] Link: ${verificationLink}`)

    // TODO: Integrate with email service (e.g., Resend, SendGrid)
    // For now, we'll just log the link and show it in the response for testing

    const response = NextResponse.json({
      success: true,
      message: "Account created successfully! Redirecting to your dashboard...",
      investorId: investorId,
      redirect: "/dashboard",
      // Include verification link in development for testing
      ...(process.env.NODE_ENV === "development" && { verificationLink })
    })
    response.cookies.set("session", String(investorId), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    })
    response.cookies.set("role", "Angel Investor", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    })
    return response
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
    console.error("Registration error:", {
      code: dbError.code,
      constraint: dbError.constraint,
      detail: dbError.detail,
      message: dbError.message || String(error),
    })
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 })
  }
}
