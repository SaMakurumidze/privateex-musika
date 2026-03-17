import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { DashboardLayout } from "@/components/dashboard-layout"
import { PortfolioSummary } from "@/components/portfolio-summary"
import { HoldingsGrid } from "@/components/holdings-grid"

export const dynamic = "force-dynamic"

export default async function PortfolioPage() {
  const session = await getSession()

  if (!session) {
    redirect("/")
  }

  // Get user's portfolio grouped by company
  const holdings = await sql`
    SELECT 
      company_id,
      company_name,
      SUM(shares_purchased) as total_shares,
      AVG(price_per_share) as avg_price,
      SUM(shares_purchased * price_per_share) as total_invested,
      MIN(purchase_date) as first_purchase,
      MAX(purchase_date) as last_purchase
    FROM portfolio 
    WHERE user_id = ${session.id}
    GROUP BY company_id, company_name
    ORDER BY total_invested DESC
  `

  // Calculate portfolio summary
  const totalValue = holdings.reduce((sum, h) => sum + Number(h.total_invested), 0)
  const totalShares = holdings.reduce((sum, h) => sum + Number(h.total_shares), 0)
  const totalCompanies = holdings.length

  return (
    <DashboardLayout user={session}>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-balance">My Portfolio</h1>
          <p className="text-lg text-muted-foreground">Track your investments and performance</p>
        </div>

        <PortfolioSummary totalValue={totalValue} totalCompanies={totalCompanies} totalShares={totalShares} />

        <HoldingsGrid holdings={holdings} />
      </div>
    </DashboardLayout>
  )
}
