import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft, Download } from "lucide-react"
import { getAdminSession, hasPermission } from "@/lib/admin-auth"
import { createSQLClient } from "@/lib/db"

type TransactionDetailRow = {
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
  phone: string | null
  address: string | null
  country: string
  id_passport: string
  wallet_balance: string | null
  certificate_number: string | null
}

type InvestorHistoryRow = {
  transaction_id: string
  purchase_date: Date
  company_name: string
  shares_purchased: number
  price_per_share: string
  status: string
  certificate_number: string | null
}

export const dynamic = "force-dynamic"

export default async function AdminTransactionDetailsPage({
  params,
}: {
  params: Promise<{ transactionId: string }>
}) {
  const admin = await getAdminSession()
  if (!admin) {
    redirect("/admin")
  }
  if (!hasPermission(admin.role, "analytics:view")) {
    redirect("/admin/dashboard")
  }

  const { transactionId } = await params
  const txId = decodeURIComponent(transactionId)
  const sql = createSQLClient()

  const details = (await sql`
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
      i.phone,
      i.address,
      i.country,
      i.id_passport,
      w.balance AS wallet_balance,
      c.certificate_number
    FROM portfolio p
    JOIN investors i ON p.user_id = i.id
    LEFT JOIN wallets w ON w.investor_id = i.id
    LEFT JOIN certificates c ON c.transaction_id = p.transaction_id
    WHERE p.transaction_id = ${txId}
    LIMIT 1
  `) as TransactionDetailRow[]

  if (details.length === 0) {
    notFound()
  }

  const tx = details[0]
  const history = (await sql`
    SELECT
      p.transaction_id,
      p.purchase_date,
      p.company_name,
      p.shares_purchased,
      p.price_per_share,
      p.status,
      c.certificate_number
    FROM portfolio p
    LEFT JOIN certificates c ON c.transaction_id = p.transaction_id
    WHERE p.user_id = ${tx.investor_id}
    ORDER BY p.purchase_date DESC
    LIMIT 20
  `) as InvestorHistoryRow[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Transaction Details</h1>
          <p className="mt-1 text-muted-foreground">Detailed investment and investor information</p>
        </div>
        <Link
          href="/admin/dashboard/transactions"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Transactions
        </Link>
      </div>

      <section className="rounded-2xl border border-border bg-card/50 p-6">
        <h2 className="mb-4 text-xl font-semibold">Investment</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Info label="Transaction ID" value={tx.transaction_id} />
          <Info label="Purchase Date" value={new Date(tx.purchase_date).toLocaleString()} />
          <Info label="Company" value={`${tx.company_name} (${tx.company_id})`} />
          <Info label="Status" value={tx.status} />
          <Info label="Shares" value={Number(tx.shares_purchased).toLocaleString()} />
          <Info
            label="Price per Share"
            value={`$${Number(tx.price_per_share).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          />
          <Info
            label="Total Amount"
            value={`$${Number(tx.total_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          />
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Certificate</p>
            {tx.certificate_number ? (
              <Link
                href={`/api/admin/certificates/${tx.certificate_number}/download`}
                target="_blank"
                className="mt-1 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted"
              >
                <Download className="h-4 w-4" />
                {tx.certificate_number}
              </Link>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">Not issued</p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card/50 p-6">
        <h2 className="mb-4 text-xl font-semibold">Investor Profile</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Info label="Full Name" value={tx.full_name} />
          <Info label="Email" value={tx.email} />
          <Info label="Phone" value={tx.phone || "-"} />
          <Info label="Country" value={tx.country || "-"} />
          <Info label="ID/Passport" value={tx.id_passport || "-"} />
          <Info label="Address" value={tx.address || "-"} />
          <Info
            label="Wallet Balance"
            value={`$${Number(tx.wallet_balance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card/50 p-6">
        <h2 className="mb-4 text-xl font-semibold">Investor Recent History</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Transaction ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Company</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Shares</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Price</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Certificate</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.transaction_id} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3 text-foreground">{row.transaction_id}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(row.purchase_date).toLocaleString()}</td>
                  <td className="px-4 py-3 text-foreground">{row.company_name}</td>
                  <td className="px-4 py-3 text-right text-foreground">{Number(row.shares_purchased).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-foreground">
                    ${Number(row.price_per_share).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {row.certificate_number ? (
                      <Link
                        href={`/api/admin/certificates/${row.certificate_number}/download`}
                        target="_blank"
                        className="text-sm text-primary hover:underline"
                      >
                        {row.certificate_number}
                      </Link>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-foreground">{value}</p>
    </div>
  )
}
