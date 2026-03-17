import { type NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/admin-auth"
import { createSQLClient } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    await requirePermission("directors:create")
    
    const body = await request.json()
    const { full_name, email, phone, position, company_id } = body

    if (!full_name || !email || !position || !company_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const sql = createSQLClient()

    await sql`
      INSERT INTO directors (full_name, email, phone, position, company_id)
      VALUES (${full_name}, ${email}, ${phone || null}, ${position}, ${company_id})
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "An error occurred"
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
