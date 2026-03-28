import Link from "next/link"
import { History, PlusCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export interface Transaction {
  transaction_id: string
  company_name: string
  company_id: string
  shares_purchased: number
  price_per_share: string
  total_amount: string
  purchase_date: Date
  status: string
}

interface TransactionsTableProps {
  transactions: Transaction[]
}

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="max-w-md mx-auto space-y-6">
          <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
            <History className="h-12 w-12 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-foreground">No Transactions Yet</h3>
            <p className="text-muted-foreground">
              You haven&apos;t made any investments yet. Start building your portfolio today!
            </p>
          </div>
          <Button asChild size="lg" className="gap-2">
            <Link href="/dashboard">
              <PlusCircle className="h-5 w-5" />
              Start Investing
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-foreground">All Transactions</h2>

      <div className="rounded-2xl bg-card/50 backdrop-blur-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-primary/5 border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Transaction ID</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Company</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Shares</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Amount Invested</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactions.map((transaction) => (
                <TransactionRow key={transaction.transaction_id} transaction={transaction} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const pricePerShare = Number.parseFloat(transaction.price_per_share)
  const totalAmount = Number.parseFloat(transaction.total_amount)
  const purchaseDate = new Date(transaction.purchase_date)

  return (
    <tr className="hover:bg-primary/5 transition-colors">
      <td className="px-6 py-4">
        <code className="text-xs bg-primary/10 px-2 py-1 rounded text-primary font-mono">
          {transaction.transaction_id}
        </code>
      </td>
      <td className="px-6 py-4">
        <div>
          <p className="font-semibold text-foreground">{transaction.company_name}</p>
          <p className="text-sm text-muted-foreground">{transaction.company_id}</p>
        </div>
      </td>
      <td className="px-6 py-4">
        <div>
          <p className="font-medium text-foreground">{transaction.shares_purchased.toLocaleString()} shares</p>
          <p className="text-sm text-muted-foreground">@ ${pricePerShare.toFixed(2)} each</p>
        </div>
      </td>
      <td className="px-6 py-4">
        <p className="font-bold text-lg text-foreground">${totalAmount.toLocaleString()}</p>
      </td>
      <td className="px-6 py-4">
        <div>
          <p className="font-medium text-foreground">
            {purchaseDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <p className="text-sm text-muted-foreground">
            {purchaseDate.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })}
          </p>
        </div>
      </td>
      <td className="px-6 py-4">
        <Badge
          variant="default"
          className="gap-1 bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20"
        >
          <CheckCircle className="h-3 w-3" />
          {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
        </Badge>
      </td>
    </tr>
  )
}
