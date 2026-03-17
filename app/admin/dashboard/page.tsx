import React from "react"
import { redirect } from "next/navigation"
import { getAdminSession, hasPermission } from "@/lib/admin-auth"
import { createSQLClient } from "@/lib/db"
import { Building2, Users, DollarSign, TrendingUp } from "lucide-react"

type TransactionRow = {
  company_name: string
  investor_count: number
  shares_sold: number
  capital_raised: number
}

export const dynamic = "force-dynamic"

export default async function AdminDashboardPage() {
  const admin = await getAdminSession()

  if (!admin) {
    redirect("/admin")
  }

  if (!hasPermission(admin.role, "analytics:view")) {
    redirect("/admin")
  }

  const sql = createSQLClient()

  // Get analytics data
  const [companiesStats, investorsStats, capitalStats, recentTransactions] = await Promise.all([
    sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE listing_status = 'listed') as listed
      FROM companies
    `,
    sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_locked = false) as active,
        COUNT(*) FILTER (WHERE is_locked = true) as locked
      FROM investors
    `,
    sql`
      SELECT 
        COALESCE(SUM(shares_purchased * price_per_share), 0) as total_capital,
        COUNT(DISTINCT user_id) as unique_investors,
        COUNT(*) as total_transactions
      FROM portfolio
      WHERE status = 'completed'
    `,
    sql`
      SELECT 
        c.company_name,
        COUNT(DISTINCT p.user_id) as investor_count,
        COALESCE(SUM(p.shares_purchased * p.price_per_share), 0) as capital_raised,
        COALESCE(SUM(p.shares_purchased), 0) as shares_sold
      FROM companies c
      LEFT JOIN portfolio p ON c.company_id = p.company_id AND p.status = 'completed'
      GROUP BY c.id, c.company_name
      ORDER BY capital_raised DESC
      LIMIT 5
    `,
  ])

  const companies = companiesStats[0]
  const investors = investorsStats[0]
  const capital = capitalStats[0]
  const typedTransactions = recentTransactions as TransactionRow[]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back, {admin.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={Building2}
          label="Total Companies"
          value={Number(companies.total)}
          subtext={`${companies.approved} approved, ${companies.pending} pending`}
        />
        <StatCard
          icon={Users}
          label="Total Investors"
          value={Number(investors.total)}
          subtext={`${investors.active} active, ${investors.locked} locked`}
        />
        <StatCard
          icon={DollarSign}
          label="Capital Raised"
          value={`$${Number(capital.total_capital).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          subtext={`${capital.total_transactions} transactions`}
        />
        <StatCard
          icon={TrendingUp}
          label="Unique Investors"
          value={Number(capital.unique_investors)}
          subtext="with completed purchases"
        />
      </div>

      <div className="bg-card/50 backdrop-blur-xl border border-border rounded-2xl p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">Top Companies by Capital Raised</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Company</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Investors</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Shares Sold</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Capital Raised</th>
              </tr>
            </thead>
            <tbody>
              {typedTransactions.map((row, index) => (
                <tr key={index} className="border-b border-border/50 last:border-0">
                  <td className="py-4 px-4 font-medium text-foreground">{row.company_name}</td>
                  <td className="py-4 px-4 text-right text-muted-foreground">{Number(row.investor_count)}</td>
                  <td className="py-4 px-4 text-right text-muted-foreground">{Number(row.shares_sold).toLocaleString()}</td>
                  <td className="py-4 px-4 text-right font-medium text-primary">
                    ${Number(row.capital_raised).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              {typedTransactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">
                    No transaction data yet
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

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  subtext: string
}) {
  return (
    <div className="bg-card/50 backdrop-blur-xl border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="shrink-0 p-2.5 rounded-xl bg-primary/10 border border-primary/20">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-3xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{subtext}</p>
      </div>
    </div>
  )
}
