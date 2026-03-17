import type React from "react"
import { DollarSign, TrendingUp, Share2, Wallet } from "lucide-react"

interface StatsCardsProps {
  walletBalance: number
  totalValue: number
  totalInvestments: number
  totalShares: number
}

export function StatsCards({ walletBalance, totalValue, totalInvestments, totalShares }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={Wallet}
        label="Wallet"
        value={`$${walletBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        highlight
      />
      <StatCard
        icon={DollarSign}
        label="Portfolio"
        value={`$${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
      />
      <StatCard icon={TrendingUp} label="Investments" value={totalInvestments.toString()} />
      <StatCard icon={Share2} label="Shares" value={totalShares.toLocaleString()} />
    </div>
  )
}

interface StatCardProps {
  icon: React.ElementType
  label: string
  value: string
  highlight?: boolean
}

function StatCard({ icon: Icon, label, value, highlight }: StatCardProps) {
  return (
    <div className={`relative overflow-hidden rounded-2xl backdrop-blur-xl border p-4 transition-all duration-200 hover:shadow-xl ${highlight ? 'bg-primary/10 border-primary/30' : 'bg-card/50 border-border hover:border-primary/30'}`}>
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-secondary ${highlight ? 'opacity-100' : 'opacity-0 hover:opacity-100'} transition-opacity`} />
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl shrink-0 ${highlight ? 'bg-primary/20 border-primary/30' : 'bg-primary/10 border-primary/20'} border`}>
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide truncate">{label}</p>
          <p className={`text-xl font-bold mt-0.5 truncate ${highlight ? 'text-primary' : 'text-foreground'}`}>{value}</p>
        </div>
      </div>
    </div>
  )
}
