import { NextResponse } from "next/server"
import { requirePermission } from "@/lib/admin-auth"
import { createSQLClient } from "@/lib/db"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    await requirePermission("companies:approve")
    const { companyId } = await params
    const sql = createSQLClient()

    await sql`
      UPDATE companies 
      SET status = 'rejected', 
          updated_at = NOW()
      WHERE company_id = ${companyId}
    `

    return NextResponse.json({ success: true, message: "Company rejected" })
  } catch (error) {
    const message = error instanceof Error ? error.message : "An error occurred"
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
