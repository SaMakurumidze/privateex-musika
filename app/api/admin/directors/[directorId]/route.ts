import { type NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/admin-auth"
import { createSQLClient } from "@/lib/db"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ directorId: string }> }
) {
  try {
    await requirePermission("directors:delete")
    const { directorId } = await params
    const sql = createSQLClient()

    await sql`
      DELETE FROM directors WHERE id = ${directorId}
    `

    return NextResponse.json({ success: true, message: "Director deleted" })
  } catch (error) {
    const message = error instanceof Error ? error.message : "An error occurred"
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ directorId: string }> }
) {
  try {
    await requirePermission("directors:edit")
    const { directorId } = await params
    const body = await request.json()
    const { full_name, email, phone, position, company_id } = body

    if (!full_name || !email || !position || !company_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const sql = createSQLClient()

    await sql`
      UPDATE directors 
      SET full_name = ${full_name}, 
          email = ${email}, 
          phone = ${phone || null}, 
          position = ${position}, 
          company_id = ${company_id},
          updated_at = NOW()
      WHERE id = ${directorId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "An error occurred"
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
