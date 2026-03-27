import type { ElementType } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { DollarSign, FileDown, ReceiptText, Wallet } from "lucide-react"
import { getAdminSession, hasPermission } from "@/lib/admin-auth"
import { createSQLClient } from "@/lib/db"

type AuditRow = {
  id: number
  transaction_id: string
  investor_name: string
  investor_email: string | null
  company_name: string
  shares_purchased: string
  price_per_share: string
  subtotal: string
  service_fee: string
  tax: string
  total_amount: string
  charged_at: Date
}

type SummaryRow = {
  total_transactions: string
  total_subtotal: string
  total_service_fees: string
  total_tax: string
  total_charged: string
}

type MonthlyRollupRow = {
  month_label: string
  txn_count: string
  subtotal_total: string
  service_fee_total: string
  tax_total: string
  gross_total: string
}

export const dynamic = "force-dynamic"

function formatMoney(value: number) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default async function AdminAccountingPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    company?: string
    investor?: string
    startDate?: string
    endDate?: string
  }>
}) {
  const admin = await getAdminSession()
  if (!admin) {
    redirect("/admin")
  }
  if (!hasPermission(admin.role, "analytics:view")) {
    redirect("/admin/dashboard")
  }

  const sql = createSQLClient()
  const params = await searchParams
  const q = (params.q || "").trim()
  const company = (params.company || "").trim()
  const investor = (params.investor || "").trim()
  const startDate = (params.startDate || "").trim()
  const endDate = (params.endDate || "").trim()

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

  const [summaryRows, auditRows, monthlyRollups] = await Promise.all([
    sql`
      SELECT
        COUNT(*)::text AS total_transactions,
        COALESCE(SUM(subtotal), 0)::text AS total_subtotal,
        COALESCE(SUM(service_fee), 0)::text AS total_service_fees,
        COALESCE(SUM(tax), 0)::text AS total_tax,
        COALESCE(SUM(total_amount), 0)::text AS total_charged
      FROM purchase_charge_audit
      WHERE (${q} = '' OR transaction_id ILIKE ${"%" + q + "%"})
        AND (${company} = '' OR company_id ILIKE ${"%" + company + "%"} OR company_name ILIKE ${"%" + company + "%"})
        AND (${investor} = '' OR investor_name ILIKE ${"%" + investor + "%"} OR investor_email ILIKE ${"%" + investor + "%"})
        AND charged_at::date >= COALESCE(NULLIF(${startDate}, '')::date, charged_at::date)
        AND charged_at::date <= COALESCE(NULLIF(${endDate}, '')::date, charged_at::date)
    `,
    sql`
      SELECT
        id,
        transaction_id,
        investor_name,
        investor_email,
        company_name,
        shares_purchased::text,
        price_per_share::text,
        subtotal::text,
        service_fee::text,
        tax::text,
        total_amount::text,
        charged_at
      FROM purchase_charge_audit
      WHERE (${q} = '' OR transaction_id ILIKE ${"%" + q + "%"})
        AND (${company} = '' OR company_id ILIKE ${"%" + company + "%"} OR company_name ILIKE ${"%" + company + "%"})
        AND (${investor} = '' OR investor_name ILIKE ${"%" + investor + "%"} OR investor_email ILIKE ${"%" + investor + "%"})
        AND charged_at::date >= COALESCE(NULLIF(${startDate}, '')::date, charged_at::date)
        AND charged_at::date <= COALESCE(NULLIF(${endDate}, '')::date, charged_at::date)
      ORDER BY charged_at DESC
      LIMIT 250
    `,
    sql`
      SELECT
        TO_CHAR(DATE_TRUNC('month', charged_at), 'YYYY-MM') AS month_label,
        COUNT(*)::text AS txn_count,
        COALESCE(SUM(subtotal), 0)::text AS subtotal_total,
        COALESCE(SUM(service_fee), 0)::text AS service_fee_total,
        COALESCE(SUM(tax), 0)::text AS tax_total,
        COALESCE(SUM(total_amount), 0)::text AS gross_total
      FROM purchase_charge_audit
      WHERE charged_at >= NOW() - INTERVAL '11 months'
      GROUP BY DATE_TRUNC('month', charged_at)
      ORDER BY DATE_TRUNC('month', charged_at) DESC
      LIMIT 12
    `,
  ])

  const summary = (summaryRows[0] || {
    total_transactions: "0",
    total_subtotal: "0",
    total_service_fees: "0",
    total_tax: "0",
    total_charged: "0",
  }) as SummaryRow

  const audits = auditRows as AuditRow[]
  const rollups = monthlyRollups as MonthlyRollupRow[]
  const csvQuery = new URLSearchParams({
    q,
    company,
    investor,
    startDate,
    endDate,
  }).toString()

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-foreground">Accounting Audit Trail</h1>
        <p className="text-muted-foreground">
          Service fee and tax charges captured for all completed wallet purchases.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={ReceiptText}
          label="Audited Transactions"
          value={Number(summary.total_transactions).toLocaleString()}
          subtext="Purchases recorded with charge details"
        />
        <KpiCard
          icon={Wallet}
          label="Total Subtotal"
          value={formatMoney(Number(summary.total_subtotal))}
          subtext="Pre-fee purchase value"
        />
        <KpiCard
          icon={DollarSign}
          label="Total Service Fees"
          value={formatMoney(Number(summary.total_service_fees))}
          subtext="Platform service fees collected"
        />
        <KpiCard
          icon={DollarSign}
          label="Total Tax Collected"
          value={formatMoney(Number(summary.total_tax))}
          subtext={`Gross charged ${formatMoney(Number(summary.total_charged))}`}
        />
      </div>

      <section className="admin-panel p-6">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-xl font-semibold">Filters</h2>
          <Link
            href={`/api/admin/accounting/export?${csvQuery}`}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            <FileDown className="h-4 w-4" />
            Export CSV
          </Link>
        </div>
        <form className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            name="q"
            defaultValue={q}
            placeholder="Transaction ID"
            aria-label="Search transaction id"
            title="Search by transaction id"
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          />
          <input
            name="company"
            defaultValue={company}
            placeholder="Company name or ID"
            aria-label="Search company"
            title="Search by company name or id"
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          />
          <input
            name="investor"
            defaultValue={investor}
            placeholder="Investor name or email"
            aria-label="Search investor"
            title="Search by investor name or email"
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          />
          <input
            name="startDate"
            defaultValue={startDate}
            type="date"
            aria-label="Start date"
            title="Start date"
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          />
          <div className="flex gap-2">
            <input
              name="endDate"
              defaultValue={endDate}
              type="date"
              aria-label="End date"
              title="End date"
              className="h-10 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm"
            />
            <button
              type="submit"
              className="h-10 rounded-md border border-primary/30 bg-primary/10 px-4 text-sm font-medium text-primary hover:bg-primary/20"
            >
              Apply
            </button>
          </div>
        </form>
      </section>

      <section className="admin-panel p-6">
        <h2 className="mb-4 text-xl font-semibold">Monthly Rollups (12 months)</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-3 text-left text-sm font-medium text-muted-foreground">Month</th>
                <th className="px-3 py-3 text-right text-sm font-medium text-muted-foreground">Transactions</th>
                <th className="px-3 py-3 text-right text-sm font-medium text-muted-foreground">Subtotal</th>
                <th className="px-3 py-3 text-right text-sm font-medium text-muted-foreground">Service Fees</th>
                <th className="px-3 py-3 text-right text-sm font-medium text-muted-foreground">Tax</th>
                <th className="px-3 py-3 text-right text-sm font-medium text-muted-foreground">Gross Charged</th>
              </tr>
            </thead>
            <tbody>
              {rollups.map((row) => (
                <tr key={row.month_label} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-3 text-sm font-medium text-foreground">{row.month_label}</td>
                  <td className="px-3 py-3 text-right text-sm text-foreground">
                    {Number(row.txn_count).toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-right text-sm text-foreground">{formatMoney(Number(row.subtotal_total || 0))}</td>
                  <td className="px-3 py-3 text-right text-sm text-foreground">{formatMoney(Number(row.service_fee_total || 0))}</td>
                  <td className="px-3 py-3 text-right text-sm text-foreground">{formatMoney(Number(row.tax_total || 0))}</td>
                  <td className="px-3 py-3 text-right text-sm font-semibold text-primary">{formatMoney(Number(row.gross_total || 0))}</td>
                </tr>
              ))}
              {rollups.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    No monthly rollups available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-panel p-6">
        <h2 className="mb-4 text-xl font-semibold">Charge Log</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px]">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-3 text-left text-sm font-medium text-muted-foreground">Date</th>
                <th className="px-3 py-3 text-left text-sm font-medium text-muted-foreground">Transaction</th>
                <th className="px-3 py-3 text-left text-sm font-medium text-muted-foreground">Investor</th>
                <th className="px-3 py-3 text-left text-sm font-medium text-muted-foreground">Company</th>
                <th className="px-3 py-3 text-right text-sm font-medium text-muted-foreground">Subtotal</th>
                <th className="px-3 py-3 text-right text-sm font-medium text-muted-foreground">Service Fee</th>
                <th className="px-3 py-3 text-right text-sm font-medium text-muted-foreground">Tax</th>
                <th className="px-3 py-3 text-right text-sm font-medium text-muted-foreground">Total Charged</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((row) => (
                <tr key={row.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-3 text-sm text-muted-foreground">
                    {new Date(row.charged_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-sm font-medium text-foreground">{row.transaction_id}</td>
                  <td className="px-3 py-3 text-sm text-foreground">
                    <div className="font-medium">{row.investor_name}</div>
                    <div className="text-xs text-muted-foreground">{row.investor_email || "-"}</div>
                  </td>
                  <td className="px-3 py-3 text-sm text-foreground">{row.company_name}</td>
                  <td className="px-3 py-3 text-right text-sm text-foreground">{formatMoney(Number(row.subtotal || 0))}</td>
                  <td className="px-3 py-3 text-right text-sm text-foreground">{formatMoney(Number(row.service_fee || 0))}</td>
                  <td className="px-3 py-3 text-right text-sm text-foreground">{formatMoney(Number(row.tax || 0))}</td>
                  <td className="px-3 py-3 text-right text-sm font-semibold text-primary">
                    {formatMoney(Number(row.total_amount || 0))}
                  </td>
                </tr>
              ))}
              {audits.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                    No accounting audit records yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  subtext,
}: {
  icon: ElementType
  label: string
  value: string
  subtext: string
}) {
  return (
    <div className="admin-panel p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
    </div>
  )
}
