import type React from "react"
import { DollarSign, Receipt, TrendingUp } from "lucide-react"

interface TransactionSummaryProps {
  totalInvested: number
  totalTransactions: number
  avgInvestment: number
}

export function TransactionSummary({ totalInvested, totalTransactions, avgInvestment }: TransactionSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <SummaryCard
        icon={DollarSign}
        label="Total Invested"
        value={`$${totalInvested.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
      />
      <SummaryCard icon={Receipt} label="Total Transactions" value={totalTransactions.toString()} />
      <SummaryCard
        icon={TrendingUp}
        label="Average Investment"
        value={`$${avgInvestment.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
      />
    </div>
  )
}

interface SummaryCardProps {
  icon: React.ElementType
  label: string
  value: string
}

function SummaryCard({ icon: Icon, label, value }: SummaryCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-card/50 backdrop-blur-xl border border-border p-6 transition-all duration-200 hover:scale-105 hover:shadow-xl hover:border-primary/30">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-secondary" />
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide mb-1">{label}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  )
}
