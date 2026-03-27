import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { createSession } from "@/lib/auth"
import { createSQLClient } from "@/lib/db"
import { assertEmail, asTrimmedString } from "@/lib/input-safety"

function isStrongPassword(password: string) {
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSpecial = /[^A-Za-z0-9\s]/.test(password)
  return hasUppercase && hasLowercase && hasNumber && hasSpecial
}

export async function POST(request: NextRequest) {
  try {
    const {
      email: rawEmail,
      currentPassword: rawCurrentPassword,
      newPassword: rawNewPassword,
      confirmPassword: rawConfirmPassword,
    } = await request.json()

    const email = assertEmail(rawEmail)
    const currentPassword = asTrimmedString(rawCurrentPassword)
    const newPassword = asTrimmedString(rawNewPassword)
    const confirmPassword = asTrimmedString(rawConfirmPassword)

    if (!email || !currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: "Please fill in all fields." }, { status: 400 })
    }

    if (newPassword.length < 8 || !isStrongPassword(newPassword)) {
      return NextResponse.json(
        {
          error:
            "New password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
        },
        { status: 400 },
      )
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "New passwords do not match." }, { status: 400 })
    }

    if (newPassword === currentPassword) {
      return NextResponse.json({ error: "New password must be different from temporary password." }, { status: 400 })
    }

    const sql = createSQLClient()
    await sql`
      ALTER TABLE investors
      ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN NOT NULL DEFAULT FALSE
    `

    const rows = await sql`
      SELECT id, email, role, password, force_password_change
      FROM investors
      WHERE LOWER(TRIM(email)) = LOWER(TRIM(${email}))
      LIMIT 1
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: "Invalid email or temporary password." }, { status: 401 })
    }

    const investor = rows[0]
    if (!investor.force_password_change) {
      return NextResponse.json({ error: "Password reset confirmation is not required for this account." }, { status: 400 })
    }

    const storedPassword = String(investor.password || "")
    const normalizedHash = storedPassword.replace(/^\$2y\$/, "$2a$")
    const passwordValid = await bcrypt.compare(currentPassword, normalizedHash)

    if (!passwordValid) {
      return NextResponse.json({ error: "Invalid email or temporary password." }, { status: 401 })
    }

    const newHash = await bcrypt.hash(newPassword, 10)
    await sql`
      UPDATE investors
      SET password = ${newHash}, force_password_change = FALSE
      WHERE id = ${investor.id}
    `

    await createSession(investor.id)
    const response = NextResponse.json({
      success: true,
      redirect: "/dashboard",
      message: "Password updated successfully.",
    })

    response.cookies.set("role", investor.role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Complete password reset error:", error)
    const message = error instanceof Error ? error.message : "An error occurred"
    const status = message.startsWith("Invalid") ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
