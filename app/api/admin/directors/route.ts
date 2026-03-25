import { type NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/admin-auth"
import { createSQLClient } from "@/lib/db"
import { asTrimmedString, assertCompanyId, assertEmail } from "@/lib/input-safety"

export async function POST(request: NextRequest) {
  try {
    await requirePermission("directors:create")
    
    const body = await request.json()
    const full_name = asTrimmedString(body.full_name)
    const email = assertEmail(body.email)
    const phone = asTrimmedString(body.phone) || null
    const position = asTrimmedString(body.position)
    const company_id = assertCompanyId(body.company_id)

    if (!full_name || !email || !position || !company_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const sql = createSQLClient()

    await sql`
      INSERT INTO directors (full_name, email, phone, position, company_id)
      VALUES (${full_name}, ${email}, ${phone}, ${position}, ${company_id})
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "An error occurred"
    const status = message.includes("Unauthorized")
      ? 401
      : message.includes("Forbidden")
      ? 403
      : message.startsWith("Invalid")
      ? 400
      : 500
    return NextResponse.json({ error: message }, { status })
  }
}
