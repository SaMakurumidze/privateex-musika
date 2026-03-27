import Link from "next/link"
import { redirect } from "next/navigation"
import { Search, Download, FileDown } from "lucide-react"
import { getAdminSession, hasPermission } from "@/lib/admin-auth"
import { createSQLClient } from "@/lib/db"

type AdminTransactionRow = {
  transaction_id: string
  purchase_date: Date
  status: string
  company_name: string
  company_id: string
  shares_purchased: number
  price_per_share: string
  total_amount: string
  investor_id: number
  full_name: string
  email: string
  country: string
  id_passport: string
  certificate_number: string | null
}

export const dynamic = "force-dynamic"

export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    company?: string
    investor?: string
    status?: string
    startDate?: string
    endDate?: string
  }>
}) {
  const admin = await getAdminSession()
  const params = await searchParams

  if (!admin) {
    redirect("/admin")
  }

  if (!hasPermission(admin.role, "analytics:view")) {
    redirect("/admin/dashboard")
  }

  const sql = createSQLClient()
  const query = (params.q || "").trim()
  const company = (params.company || "").trim()
  const investor = (params.investor || "").trim()
  const status = (params.status || "").trim().toLowerCase()
  const startDate = (params.startDate || "").trim()
  const endDate = (params.endDate || "").trim()
  const canExport = hasPermission(admin.role, "analytics:export")

  const transactions = (await sql`
    SELECT
      p.transaction_id,
      p.purchase_date,
      p.status,
      p.company_name,
      p.company_id,
      p.shares_purchased,
      p.price_per_share,
      (p.shares_purchased * p.price_per_share) AS total_amount,
      i.id AS investor_id,
      i.full_name,
      i.email,
      i.country,
      i.id_passport,
      c.certificate_number
    FROM portfolio p
    JOIN investors i ON p.user_id = i.id
    LEFT JOIN certificates c ON c.transaction_id = p.transaction_id
    WHERE (${query} = '' OR p.transaction_id ILIKE ${"%" + query + "%"})
      AND (${company} = '' OR p.company_id ILIKE ${"%" + company + "%"} OR p.company_name ILIKE ${"%" + company + "%"})
      AND (${investor} = '' OR i.full_name ILIKE ${"%" + investor + "%"} OR i.email ILIKE ${"%" + investor + "%"})
      AND (${status} = '' OR LOWER(p.status) = ${status})
      AND p.purchase_date::date >= COALESCE(NULLIF(${startDate}, '')::date, p.purchase_date::date)
      AND p.purchase_date::date <= COALESCE(NULLIF(${endDate}, '')::date, p.purchase_date::date)
    ORDER BY p.purchase_date DESC
    LIMIT 150
  `) as AdminTransactionRow[]

  const csvQuery = new URLSearchParams({
    q: query,
    company,
    investor,
    status,
    startDate,
    endDate,
  }).toString()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Transactions</h1>
        <p className="mt-1 text-muted-foreground">
          Search by transaction ID and inspect investor-level investment records
        </p>
      </div>

      <div className="admin-panel p-6">
        <form className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="relative lg:col-span-3">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search by transaction ID..."
              className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <input
            type="text"
            name="company"
            defaultValue={company}
            placeholder="Company ID or name"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary lg:col-span-2"
          />
          <input
            type="text"
            name="investor"
            defaultValue={investor}
            placeholder="Investor name or email"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary lg:col-span-2"
          />
          <select
            name="status"
            defaultValue={status}
            aria-label="Filter by transaction status"
            title="Filter by transaction status"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary lg:col-span-1"
          >
            <option value="">All status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
          </select>
          <input
            type="date"
            name="startDate"
            defaultValue={startDate}
            aria-label="Filter start date"
            title="Filter start date"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary lg:col-span-1"
          />
          <input
            type="date"
            name="endDate"
            defaultValue={endDate}
            aria-label="Filter end date"
            title="Filter end date"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary lg:col-span-1"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/90 lg:col-span-1"
          >
            Search
          </button>
          {canExport ? (
            <Link
              href={`/api/admin/transactions/export?${csvQuery}`}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted lg:col-span-2"
            >
              <FileDown className="h-4 w-4" />
              Export CSV
            </Link>
          ) : null}
        </form>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Transaction ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Investor</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Company</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Shares</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Price</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Total</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Certificate</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.transaction_id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-4">
                    <div>
                      <Link
                        href={`/admin/dashboard/transactions/${encodeURIComponent(tx.transaction_id)}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {tx.transaction_id}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.purchase_date).toLocaleString()}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-medium text-foreground">{tx.full_name}</p>
                      <p className="text-xs text-muted-foreground">{tx.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.country} • {tx.id_passport}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-medium text-foreground">{tx.company_name}</p>
                    <p className="text-xs text-muted-foreground">{tx.company_id}</p>
                  </td>
                  <td className="px-4 py-4 text-right text-foreground">{Number(tx.shares_purchased).toLocaleString()}</td>
                  <td className="px-4 py-4 text-right text-foreground">
                    ${Number(tx.price_per_share).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-4 text-right font-medium text-primary">
                    ${Number(tx.total_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span
                      className={`inline-block rounded-full border px-2 py-1 text-xs font-medium ${
                        tx.status === "completed"
                          ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-400"
                          : "border-amber-500/30 bg-amber-500/20 text-amber-400"
                      }`}
                    >
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {tx.certificate_number ? (
                      <Link
                        href={`/api/admin/certificates/${tx.certificate_number}/download`}
                        target="_blank"
                        className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted"
                      >
                        <Download className="h-4 w-4" />
                        {tx.certificate_number}
                      </Link>
                    ) : (
                      <span className="text-sm text-muted-foreground">Not issued</span>
                    )}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No transactions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
