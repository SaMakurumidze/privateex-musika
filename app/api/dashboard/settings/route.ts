import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { createSQLClient } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const phone = typeof body.phone === "string" ? body.phone.trim() : ""
    const address = typeof body.address === "string" ? body.address.trim() : ""
    const profilePictureUrl =
      typeof body.profilePictureUrl === "string" ? body.profilePictureUrl.trim() : ""

    if (phone) {
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, "")
      const phoneRegex = /^\+?[0-9]{7,15}$/
      if (!phoneRegex.test(cleanPhone)) {
        return NextResponse.json(
          { error: "Invalid phone number. Please enter a valid phone number with country code." },
          { status: 400 },
        )
      }
    }

    const sql = createSQLClient()
    await sql`
      UPDATE investors
      SET
        phone = ${phone || null},
        address = ${address || null},
        profile_picture_url = ${profilePictureUrl || null}
      WHERE id = ${session.id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Settings update error:", error)
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}
