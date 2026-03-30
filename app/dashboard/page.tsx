import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { createSQLClient } from "@/lib/db"
import { DashboardLayout } from "@/components/dashboard-layout"
import { StatsCards } from "@/components/stats-cards"
import { CompaniesGrid, type Company } from "@/components/companies-grid"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const sql = createSQLClient()
  const session = await getSession()

  if (!session) {
    redirect("/")
  }

  // Get wallet balance
  let walletBalance = 10000.00
  const wallet = await sql`
    SELECT balance FROM wallets WHERE investor_id = ${session.id}
  `
  if (wallet.length === 0) {
    // Create wallet if it doesn't exist
    await sql`
      INSERT INTO wallets (investor_id, balance)
      VALUES (${session.id}, 10000.00)
    `
  } else {
    walletBalance = Number.parseFloat(wallet[0].balance)
  }

  // Get portfolio summary
  const portfolioSummary = await sql`
    SELECT 
      COUNT(*) as total_investments,
      COALESCE(SUM(shares_purchased * price_per_share), 0) as total_value,
      COALESCE(SUM(shares_purchased), 0) as total_shares
    FROM portfolio 
    WHERE user_id = ${session.id}
  `

  // Only show investable companies on investor dashboard.
  const companies = await sql`
    SELECT 
      id,
      company_id,
      company_name,
      price_per_share,
      available_shares,
      total_shares,
      logo_url,
      sector,
      description,
      funding_round,
      security_type,
      return_rate,
      company_info_url,
      created_at,
      updated_at
    FROM companies
    WHERE available_shares > 0
      AND status = 'approved'
      AND listing_status = 'listed'
    ORDER BY created_at DESC
  `

  const summary = portfolioSummary[0] || {
    total_investments: 0,
    total_value: 0,
    total_shares: 0,
  }

  return (
    <DashboardLayout user={session}>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-balance">Available Companies</h1>
          <p className="text-lg text-muted-foreground">Invest in promising pre-IPO companies</p>
        </div>

        <StatsCards
          walletBalance={walletBalance}
          totalValue={Number(summary.total_value)}
          totalInvestments={Number(summary.total_investments)}
          totalShares={Number(summary.total_shares)}
        />

        <CompaniesGrid companies={companies as Company[]} investorName={session.full_name} />
      </div>
    </DashboardLayout>
  )
}
