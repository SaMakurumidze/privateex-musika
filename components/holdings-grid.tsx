import Link from "next/link"
import { Building2, PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Holding {
  company_id: string
  company_name: string
  total_shares: number
  avg_price: string
  total_invested: string
  first_purchase: Date
  last_purchase: Date
}

interface HoldingsGridProps {
  holdings: Holding[]
}

export function HoldingsGrid({ holdings }: HoldingsGridProps) {
  if (holdings.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="max-w-md mx-auto space-y-6">
          <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
            <Building2 className="h-12 w-12 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-foreground">Your Portfolio is Empty</h3>
            <p className="text-muted-foreground">
              Start building your investment portfolio by exploring available companies.
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
      <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <Building2 className="h-6 w-6 text-primary" />
        Your Holdings
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {holdings.map((holding) => (
          <HoldingCard key={holding.company_id} holding={holding} />
        ))}
      </div>
    </div>
  )
}

function HoldingCard({ holding }: { holding: Holding }) {
  const avgPrice = Number.parseFloat(holding.avg_price)
  const totalInvested = Number.parseFloat(holding.total_invested)
  const firstPurchase = new Date(holding.first_purchase)

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-card/50 backdrop-blur-xl border border-border p-6 transition-all duration-200 hover:scale-105 hover:shadow-2xl hover:border-primary/30">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-start gap-4 mb-6">
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-foreground mb-1 truncate">{holding.company_name}</h3>
          <p className="text-sm text-muted-foreground truncate">{holding.company_id}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Shares Owned</p>
            <p className="text-xl font-bold text-foreground">{Number(holding.total_shares).toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg. Price</p>
            <p className="text-xl font-bold text-foreground">${avgPrice.toFixed(2)}</p>
          </div>
        </div>

        <div className="pt-4 border-t border-border space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total Invested</span>
            <span className="text-lg font-bold text-primary">${totalInvested.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">First Purchase</span>
            <span className="text-sm font-medium text-foreground">
              {firstPurchase.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
