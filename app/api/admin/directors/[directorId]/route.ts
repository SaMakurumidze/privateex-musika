import { type NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/admin-auth"
import { createSQLClient } from "@/lib/db"
import {
  asTrimmedString,
  assertCompanyId,
  assertEmail,
  assertIntegerId,
} from "@/lib/input-safety"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ directorId: string }> }
) {
  try {
    await requirePermission("directors:delete")
    const { directorId: rawDirectorId } = await params
    const directorId = assertIntegerId(rawDirectorId, "director ID")
    const sql = createSQLClient()

    await sql`
      DELETE FROM directors WHERE id = ${directorId}
    `

    return NextResponse.json({ success: true, message: "Director deleted" })
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ directorId: string }> }
) {
  try {
    await requirePermission("directors:edit")
    const { directorId: rawDirectorId } = await params
    const directorId = assertIntegerId(rawDirectorId, "director ID")
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
      UPDATE directors 
      SET full_name = ${full_name}, 
          email = ${email}, 
          phone = ${phone}, 
          position = ${position}, 
          company_id = ${company_id},
          updated_at = NOW()
      WHERE id = ${directorId}
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
