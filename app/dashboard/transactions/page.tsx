import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { DashboardLayout } from "@/components/dashboard-layout"
import { TransactionSummary } from "@/components/transaction-summary"
import { TransactionsTable } from "@/components/transactions-table"

export const dynamic = "force-dynamic"

export default async function TransactionsPage() {
  const session = await getSession()

  if (!session) {
    redirect("/")
  }

  // Get user's transaction history
  const transactions = await sql`
    SELECT 
      transaction_id,
      company_name,
      company_id,
      shares_purchased,
      price_per_share,
      (shares_purchased * price_per_share) as total_amount,
      purchase_date,
      status
    FROM portfolio 
    WHERE user_id = ${session.id}
    ORDER BY purchase_date DESC
  `

  // Calculate summary statistics
  const totalInvested = transactions.reduce((sum, t) => sum + Number(t.total_amount), 0)
  const totalTransactions = transactions.length
  const avgInvestment = totalTransactions > 0 ? totalInvested / totalTransactions : 0

  return (
    <DashboardLayout user={session}>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-balance">Transaction History</h1>
          <p className="text-lg text-muted-foreground">View all your investment transactions</p>
        </div>

        <TransactionSummary
          totalInvested={totalInvested}
          totalTransactions={totalTransactions}
          avgInvestment={avgInvestment}
        />

        <TransactionsTable transactions={transactions} />
      </div>
    </DashboardLayout>
  )
}
