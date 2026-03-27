import { type NextRequest, NextResponse } from "next/server"
import { getAdminSession, hasPermission } from "@/lib/admin-auth"
import { createSQLClient } from "@/lib/db"

export const runtime = "nodejs"

type AccountingExportRow = {
  charged_at: Date
  transaction_id: string
  investor_name: string
  investor_email: string | null
  company_id: string
  company_name: string
  shares_purchased: string
  price_per_share: string
  subtotal: string
  service_fee: string
  tax: string
  total_amount: string
  payment_method: string
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
    const startDate = (searchParams.get("startDate") || "").trim()
    const endDate = (searchParams.get("endDate") || "").trim()

    const sql = createSQLClient()
    await sql`
      CREATE TABLE IF NOT EXISTS purchase_charge_audit (
        id SERIAL PRIMARY KEY,
        transaction_id VARCHAR(120) NOT NULL UNIQUE,
        investor_id INTEGER NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
        investor_name VARCHAR(255) NOT NULL,
        investor_email VARCHAR(255),
        company_id VARCHAR(40) NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        shares_purchased NUMERIC(18, 6) NOT NULL,
        price_per_share NUMERIC(18, 6) NOT NULL,
        subtotal NUMERIC(18, 2) NOT NULL,
        service_fee NUMERIC(18, 2) NOT NULL,
        tax NUMERIC(18, 2) NOT NULL,
        total_amount NUMERIC(18, 2) NOT NULL,
        payment_method VARCHAR(40) NOT NULL DEFAULT 'Wallet',
        charged_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `

    const rows = (await sql`
      SELECT
        charged_at,
        transaction_id,
        investor_name,
        investor_email,
        company_id,
        company_name,
        shares_purchased::text,
        price_per_share::text,
        subtotal::text,
        service_fee::text,
        tax::text,
        total_amount::text,
        payment_method
      FROM purchase_charge_audit
      WHERE (${q} = '' OR transaction_id ILIKE ${"%" + q + "%"})
        AND (${company} = '' OR company_id ILIKE ${"%" + company + "%"} OR company_name ILIKE ${"%" + company + "%"})
        AND (${investor} = '' OR investor_name ILIKE ${"%" + investor + "%"} OR investor_email ILIKE ${"%" + investor + "%"})
        AND charged_at::date >= COALESCE(NULLIF(${startDate}, '')::date, charged_at::date)
        AND charged_at::date <= COALESCE(NULLIF(${endDate}, '')::date, charged_at::date)
      ORDER BY charged_at DESC
      LIMIT 10000
    `) as AccountingExportRow[]

    const header = [
      "charged_at",
      "transaction_id",
      "investor_name",
      "investor_email",
      "company_id",
      "company_name",
      "shares_purchased",
      "price_per_share",
      "subtotal",
      "service_fee",
      "tax",
      "total_amount",
      "payment_method",
    ]

    const lines = [
      header.join(","),
      ...rows.map((row) =>
        [
          csvCell(new Date(row.charged_at).toISOString()),
          csvCell(row.transaction_id),
          csvCell(row.investor_name),
          csvCell(row.investor_email ?? ""),
          csvCell(row.company_id),
          csvCell(row.company_name),
          csvCell(row.shares_purchased),
          csvCell(row.price_per_share),
          csvCell(row.subtotal),
          csvCell(row.service_fee),
          csvCell(row.tax),
          csvCell(row.total_amount),
          csvCell(row.payment_method),
        ].join(","),
      ),
    ]

    const fileName = `admin-accounting-audit-${new Date().toISOString().slice(0, 10)}.csv`
    return new NextResponse(lines.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error("Admin accounting export error:", error)
    return NextResponse.json({ error: "Failed to export accounting audit" }, { status: 500 })
  }
}
