import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { createSQLClient } from "@/lib/db"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = createSQLClient()

    const certificates = await sql`
      SELECT
        certificate_number,
        transaction_id,
        company_name,
        share_class,
        shares_purchased,
        price_per_share,
        total_amount,
        status,
        pdf_url,
        issued_at
      FROM certificates
      WHERE investor_id = ${session.id}
      ORDER BY issued_at DESC
    `

    return NextResponse.json({ certificates })
  } catch (error) {
    console.error("Certificates list error:", error)
    return NextResponse.json({ error: "Failed to fetch certificates" }, { status: 500 })
  }
}
