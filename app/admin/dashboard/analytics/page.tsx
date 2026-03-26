import { redirect } from "next/navigation"
import { getAdminSession, hasPermission } from "@/lib/admin-auth"
import { createSQLClient } from "@/lib/db"
import { BarChart3, Building2, DollarSign, Globe2, TrendingUp, Users, Wallet } from "lucide-react"

export const dynamic = "force-dynamic"

type MonthlyInvestment = {
  month: Date
  total_amount: number
  total_transactions: number
  active_investors: number
}

type TopCompany = {
  company_name: string
  sector: string | null
  capital_raised: number
  transactions: number
}

type TopInvestor = {
  full_name: string
  email: string
  country: string | null
  total_invested: number
  transactions: number
}

type CountryDistribution = {
  country: string | null
  investor_count: number
}

type SectorPerformance = {
  sector: string | null
  company_count: number
  capital_raised: number
}

function formatCurrency(value: number) {
  return `$${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`
}

export default async function AdminAnalyticsPage() {
  const admin = await getAdminSession()

  if (!admin) {
    redirect("/admin")
  }

  if (!hasPermission(admin.role, "analytics:view")) {
    redirect("/admin/dashboard")
  }

  const sql = createSQLClient()

  const [
    investorsStatsRows,
    companiesStatsRows,
    transactionsStatsRows,
    walletsStatsRows,
    monthlyInvestmentsRows,
    topCompaniesRows,
    topInvestorsRows,
    countryDistributionRows,
    sectorPerformanceRows,
  ] = await Promise.all([
    sql`
      SELECT
        COUNT(*)::int AS total_investors,
        COUNT(*) FILTER (WHERE is_locked = false)::int AS active_investors,
        COUNT(*) FILTER (WHERE is_locked = true)::int AS locked_investors,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS new_last_30_days
      FROM investors
    `,
    sql`
      SELECT
        COUNT(*)::int AS total_companies,
        COUNT(*) FILTER (WHERE status = 'approved')::int AS approved_companies,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_companies,
        COUNT(*) FILTER (WHERE listing_status = 'listed')::int AS listed_companies
      FROM companies
    `,
    sql`
      SELECT
        COALESCE(SUM(shares_purchased * price_per_share), 0)::numeric AS total_capital_raised,
        COUNT(*)::int AS total_transactions,
        COUNT(DISTINCT user_id)::int AS unique_investors,
        COALESCE(AVG(shares_purchased * price_per_share), 0)::numeric AS avg_ticket_size
      FROM portfolio
      WHERE status = 'completed'
    `,
    sql`
      SELECT
        COALESCE(SUM(balance), 0)::numeric AS total_wallet_balance,
        COALESCE(AVG(balance), 0)::numeric AS avg_wallet_balance,
        COUNT(*)::int AS wallet_count
      FROM wallets
    `,
    sql`
      SELECT
        DATE_TRUNC('month', purchase_date) AS month,
        COALESCE(SUM(shares_purchased * price_per_share), 0)::numeric AS total_amount,
        COUNT(*)::int AS total_transactions,
        COUNT(DISTINCT user_id)::int AS active_investors
      FROM portfolio
      WHERE status = 'completed'
        AND purchase_date >= NOW() - INTERVAL '6 months'
      GROUP BY 1
      ORDER BY 1 ASC
    `,
    sql`
      SELECT
        c.company_name,
        c.sector,
        COALESCE(SUM(p.shares_purchased * p.price_per_share), 0)::numeric AS capital_raised,
        COUNT(p.id)::int AS transactions
      FROM companies c
      LEFT JOIN portfolio p
        ON c.company_id = p.company_id
       AND p.status = 'completed'
      GROUP BY c.id, c.company_name, c.sector
      ORDER BY capital_raised DESC, transactions DESC
      LIMIT 8
    `,
    sql`
      SELECT
        i.full_name,
        i.email,
        i.country,
        COALESCE(SUM(p.shares_purchased * p.price_per_share), 0)::numeric AS total_invested,
        COUNT(p.id)::int AS transactions
      FROM investors i
      LEFT JOIN portfolio p
        ON i.id = p.user_id
       AND p.status = 'completed'
      GROUP BY i.id, i.full_name, i.email, i.country
      ORDER BY total_invested DESC, transactions DESC
      LIMIT 8
    `,
    sql`
      SELECT
        country,
        COUNT(*)::int AS investor_count
      FROM investors
      GROUP BY country
      ORDER BY investor_count DESC
      LIMIT 10
    `,
    sql`
      SELECT
        COALESCE(sector, 'Unclassified') AS sector,
        COUNT(*)::int AS company_count,
        COALESCE(SUM(p.shares_purchased * p.price_per_share), 0)::numeric AS capital_raised
      FROM companies c
      LEFT JOIN portfolio p
        ON c.company_id = p.company_id
       AND p.status = 'completed'
      GROUP BY COALESCE(sector, 'Unclassified')
      ORDER BY capital_raised DESC, company_count DESC
      LIMIT 8
    `,
  ])

  const investorsStats = investorsStatsRows[0]
  const companiesStats = companiesStatsRows[0]
  const transactionsStats = transactionsStatsRows[0]
  const walletsStats = walletsStatsRows[0]
  const monthlyInvestments = monthlyInvestmentsRows as MonthlyInvestment[]
  const topCompanies = topCompaniesRows as TopCompany[]
  const topInvestors = topInvestorsRows as TopInvestor[]
  const countryDistribution = countryDistributionRows as CountryDistribution[]
  const sectorPerformance = sectorPerformanceRows as SectorPerformance[]

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground">Live operational and investment intelligence</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={DollarSign}
          label="Total Capital Raised"
          value={formatCurrency(Number(transactionsStats.total_capital_raised))}
          subtext={`${transactionsStats.total_transactions} completed transactions`}
        />
        <KpiCard
          icon={Users}
          label="Investor Base"
          value={Number(investorsStats.total_investors)}
          subtext={`${investorsStats.active_investors} active, ${investorsStats.new_last_30_days} new (30d)`}
        />
        <KpiCard
          icon={Building2}
          label="Company Listings"
          value={Number(companiesStats.total_companies)}
          subtext={`${companiesStats.listed_companies} listed, ${companiesStats.pending_companies} pending`}
        />
        <KpiCard
          icon={Wallet}
          label="Total Wallet Liquidity"
          value={formatCurrency(Number(walletsStats.total_wallet_balance))}
          subtext={`Avg ${formatCurrency(Number(walletsStats.avg_wallet_balance))}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card/50 p-6">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Monthly Investment Trend (6 months)</h2>
          </div>
          <div className="space-y-3">
            {monthlyInvestments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transaction data available yet.</p>
            ) : (
              monthlyInvestments.map((row) => {
                const amount = Number(row.total_amount || 0)
                return (
                  <div key={String(row.month)} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground">
                        {new Date(row.month).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span className="text-muted-foreground">
                        {formatCurrency(amount)} ({row.total_transactions} tx)
                      </span>
                    </div>
                    <div className="h-2 rounded bg-primary/20" />
                  </div>
                )
              })
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card/50 p-6">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Sector Performance</h2>
          </div>
          <div className="space-y-3">
            {sectorPerformance.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sector data available yet.</p>
            ) : (
              sectorPerformance.map((row) => (
                <div key={row.sector || "unknown"} className="rounded-lg border border-border/60 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground">{row.sector || "Unclassified"}</p>
                    <p className="text-sm text-primary">{formatCurrency(Number(row.capital_raised))}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{row.company_count} companies</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card/50 p-6">
          <h2 className="mb-4 text-xl font-semibold">Top Companies by Capital Raised</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Company</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Sector</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Transactions</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Capital</th>
                </tr>
              </thead>
              <tbody>
                {topCompanies.map((company, index) => (
                  <tr key={`${company.company_name}-${index}`} className="border-b border-border/50 last:border-0">
                    <td className="px-3 py-3 text-sm font-medium">{company.company_name}</td>
                    <td className="px-3 py-3 text-sm text-muted-foreground">{company.sector || "Unclassified"}</td>
                    <td className="px-3 py-3 text-right text-sm">{company.transactions}</td>
                    <td className="px-3 py-3 text-right text-sm text-primary">
                      {formatCurrency(Number(company.capital_raised))}
                    </td>
                  </tr>
                ))}
                {topCompanies.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-sm text-muted-foreground">
                      No company analytics available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card/50 p-6">
          <h2 className="mb-4 text-xl font-semibold">Top Investors by Activity</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Investor</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Country</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Transactions</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Total Invested</th>
                </tr>
              </thead>
              <tbody>
                {topInvestors.map((investor, index) => (
                  <tr key={`${investor.email}-${index}`} className="border-b border-border/50 last:border-0">
                    <td className="px-3 py-3 text-sm font-medium">{investor.full_name}</td>
                    <td className="px-3 py-3 text-sm text-muted-foreground">{investor.country || "Unknown"}</td>
                    <td className="px-3 py-3 text-right text-sm">{investor.transactions}</td>
                    <td className="px-3 py-3 text-right text-sm text-primary">
                      {formatCurrency(Number(investor.total_invested))}
                    </td>
                  </tr>
                ))}
                {topInvestors.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-sm text-muted-foreground">
                      No investor analytics available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card/50 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Globe2 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Investor Geography</h2>
        </div>
        {countryDistribution.length === 0 ? (
          <p className="text-sm text-muted-foreground">No geographic data available yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {countryDistribution.map((row) => (
              <div key={row.country || "unknown"} className="rounded-lg border border-border/60 p-3">
                <p className="text-sm font-medium">{row.country || "Unknown"}</p>
                <p className="text-xs text-muted-foreground">{row.investor_count} investors</p>
              </div>
            ))}
          </div>
        )}
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
  icon: React.ElementType
  label: string
  value: string | number
  subtext: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/50 p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="rounded-lg border border-primary/20 bg-primary/10 p-2">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
    </div>
  )
}
