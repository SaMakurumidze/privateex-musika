import { NextResponse } from "next/server"
import { requirePermission } from "@/lib/admin-auth"
import { createSQLClient } from "@/lib/db"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ investorId: string }> }
) {
  try {
    await requirePermission("investors:lock")
    const { investorId } = await params
    const sql = createSQLClient()

    await sql`
      UPDATE investors 
      SET is_locked = true
      WHERE id = ${investorId}
    `

    return NextResponse.json({ success: true, message: "Account locked" })
  } catch (error) {
    const message = error instanceof Error ? error.message : "An error occurred"
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
