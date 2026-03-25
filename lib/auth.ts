import { cookies } from "next/headers"
import { createSQLClient } from "./db"
import bcrypt from "bcryptjs"
import crypto from "crypto"

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
      SELECT * FROM investors WHERE LOWER(TRIM(email)) = LOWER(TRIM(${email}))
    `

    if (investors.length === 0) {
      return null
    }

    const investor = investors[0]
    const storedPassword = String(investor.password || "")
    // Normalize $2y$ (PHP bcrypt) to $2a$ (bcryptjs) prefix for compatibility
    const normalizedHash = storedPassword.replace(/^\$2y\$/, "$2a$")
    let isValid = false
    let shouldRehash = false

    if (/^\$2[aby]\$/.test(normalizedHash)) {
      isValid = await bcrypt.compare(password, normalizedHash)
    } else if (storedPassword === password) {
      // Legacy plain-text records can still login once and then be upgraded.
      isValid = true
      shouldRehash = true
    } else if (/^[a-f0-9]{32}$/i.test(storedPassword)) {
      // Legacy MD5 records can login once and then be upgraded.
      const md5 = crypto.createHash("md5").update(password).digest("hex")
      if (md5.toLowerCase() === storedPassword.toLowerCase()) {
        isValid = true
        shouldRehash = true
      }
    }

    if (!isValid) {
      return null
    }

    if (shouldRehash) {
      const upgradedHash = await bcrypt.hash(password, 10)
      await sql`
        UPDATE investors
        SET password = ${upgradedHash}
        WHERE id = ${investor.id}
      `
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
