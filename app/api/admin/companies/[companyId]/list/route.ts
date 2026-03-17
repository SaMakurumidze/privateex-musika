import { NextResponse } from "next/server"
import { requirePermission } from "@/lib/admin-auth"
import { createSQLClient } from "@/lib/db"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    await requirePermission("companies:authorize")
    const { companyId } = await params
    const sql = createSQLClient()

    // Only list if approved
    const company = await sql`
      SELECT status FROM companies WHERE company_id = ${companyId}
    `

    if (company.length === 0) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    if (company[0].status !== "approved") {
      return NextResponse.json({ error: "Company must be approved before listing" }, { status: 400 })
    }

    await sql`
      UPDATE companies 
      SET listing_status = 'listed', 
          updated_at = NOW()
      WHERE company_id = ${companyId}
    `

    return NextResponse.json({ success: true, message: "Company listed" })
  } catch (error) {
    const message = error instanceof Error ? error.message : "An error occurred"
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
