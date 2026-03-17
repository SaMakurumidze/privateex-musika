import { cookies } from "next/headers"
import { createSQLClient } from "./db"
import bcrypt from "bcryptjs"

export interface Investor {
  id: number
  full_name: string
  email: string
  role: string
  address: string
  id_passport: string
  country: string
}

export async function getSession(): Promise<Investor | null> {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("session")?.value

  if (!sessionId) {
    return null
  }

  try {
    const sql = createSQLClient()
    const investors = await sql`
      SELECT id, full_name, email, role, address, id_passport, country 
      FROM investors 
      WHERE id = ${sessionId}
    `

    if (investors.length === 0) {
      return null
    }

    return investors[0] as Investor
  } catch (error) {
    console.error("Session error:", error)
    return null
  }
}

export async function verifyCredentials(email: string, password: string) {
  try {
    const sql = createSQLClient()
    const investors = await sql`
      SELECT * FROM investors WHERE email = ${email}
    `

    if (investors.length === 0) {
      return null
    }

    const investor = investors[0]
    // Normalize $2y$ (PHP bcrypt) to $2a$ (bcryptjs) prefix for compatibility
    const normalizedHash = investor.password.replace(/^\$2y\$/, "$2a$")
    const isValid = await bcrypt.compare(password, normalizedHash)

    if (!isValid) {
      return null
    }

    // Check if email is verified
    if (investor.email_verified === false) {
      const error = new Error("EMAIL_NOT_VERIFIED")
      ;(error as Error & { code: string }).code = "EMAIL_NOT_VERIFIED"
      throw error
    }

    return {
      id: investor.id,
      full_name: investor.full_name,
      email: investor.email,
      role: investor.role,
      address: investor.address,
      id_passport: investor.id_passport,
      country: investor.country,
    }
  } catch (error) {
    // Re-throw email verification error
    if ((error as Error & { code?: string }).code === "EMAIL_NOT_VERIFIED") {
      throw error
    }
    console.error("Verify credentials error:", error)
    return null
  }
}

export async function createSession(investorId: number) {
  const cookieStore = await cookies()
  cookieStore.set("session", investorId.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete("session")
}
