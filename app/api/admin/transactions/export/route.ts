import { type NextRequest, NextResponse } from "next/server"
import { getAdminSession, hasPermission } from "@/lib/admin-auth"
import { createSQLClient } from "@/lib/db"

export const runtime = "nodejs"

type ExportRow = {
  transaction_id: string
  purchase_date: Date
  status: string
  company_name: string
  company_id: string
  shares_purchased: number
  price_per_share: string
  total_amount: string
  full_name: string
  email: string
  country: string
  id_passport: string
  certificate_number: string | null
}

function csvCell(value: unknown): string {
  const raw = String(value ?? "")
  return `"${raw.replaceAll(`"`, `""`)}"`
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminSession()
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!hasPermission(admin.role, "analytics:export")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get("q") || "").trim()
    const company = (searchParams.get("company") || "").trim()
    const investor = (searchParams.get("investor") || "").trim()
    const status = (searchParams.get("status") || "").trim().toLowerCase()
    const startDate = (searchParams.get("startDate") || "").trim()
    const endDate = (searchParams.get("endDate") || "").trim()

    const sql = createSQLClient()
    const rows = (await sql`
      SELECT
        p.transaction_id,
        p.purchase_date,
        p.status,
        p.company_name,
        p.company_id,
        p.shares_purchased,
        p.price_per_share,
        (p.shares_purchased * p.price_per_share) AS total_amount,
        i.full_name,
        i.email,
        i.country,
        i.id_passport,
        c.certificate_number
      FROM portfolio p
      JOIN investors i ON p.user_id = i.id
      LEFT JOIN certificates c ON c.transaction_id = p.transaction_id
      WHERE (${q} = '' OR p.transaction_id ILIKE ${"%" + q + "%"})
        AND (${company} = '' OR p.company_id ILIKE ${"%" + company + "%"} OR p.company_name ILIKE ${"%" + company + "%"})
        AND (${investor} = '' OR i.full_name ILIKE ${"%" + investor + "%"} OR i.email ILIKE ${"%" + investor + "%"})
        AND (${status} = '' OR LOWER(p.status) = ${status})
        AND p.purchase_date::date >= COALESCE(NULLIF(${startDate}, '')::date, p.purchase_date::date)
        AND p.purchase_date::date <= COALESCE(NULLIF(${endDate}, '')::date, p.purchase_date::date)
      ORDER BY p.purchase_date DESC
      LIMIT 5000
    `) as ExportRow[]

    const header = [
      "transaction_id",
      "purchase_date",
      "status",
      "company_name",
      "company_id",
      "shares_purchased",
      "price_per_share",
      "total_amount",
      "investor_name",
      "investor_email",
      "investor_country",
      "investor_id_passport",
      "certificate_number",
    ]

    const lines = [
      header.join(","),
      ...rows.map((row) =>
        [
          csvCell(row.transaction_id),
          csvCell(new Date(row.purchase_date).toISOString()),
          csvCell(row.status),
          csvCell(row.company_name),
          csvCell(row.company_id),
          csvCell(row.shares_purchased),
          csvCell(row.price_per_share),
          csvCell(row.total_amount),
          csvCell(row.full_name),
          csvCell(row.email),
          csvCell(row.country),
          csvCell(row.id_passport),
          csvCell(row.certificate_number ?? ""),
        ].join(","),
      ),
    ]

    const fileName = `admin-transactions-${new Date().toISOString().slice(0, 10)}.csv`
    return new NextResponse(lines.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error("Admin transaction export error:", error)
    return NextResponse.json({ error: "Failed to export transactions" }, { status: 500 })
  }
}
