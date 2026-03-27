import { redirect } from "next/navigation"
import { getAdminSession, hasPermission } from "@/lib/admin-auth"
import { createSQLClient } from "@/lib/db"
import { Search, Wallet } from "lucide-react"

type WalletRow = {
  id: number
  balance: string
  created_at: Date
  updated_at: Date
  investor_id: number
  full_name: string
  email: string
  is_locked: boolean
}

export const dynamic = "force-dynamic"

export default async function AdminWalletsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const admin = await getAdminSession()
  const params = await searchParams

  if (!admin) {
    redirect("/admin")
  }

  if (!hasPermission(admin.role, "wallets:view")) {
    redirect("/admin/dashboard")
  }

  const sql = createSQLClient()
  const searchQuery = params.q || ""

  const wallets = await sql`
    SELECT 
      w.id,
      w.balance,
      w.created_at,
      w.updated_at,
      i.id as investor_id,
      i.full_name,
      i.email,
      i.is_locked
    FROM wallets w
    JOIN investors i ON w.investor_id = i.id
    WHERE i.full_name ILIKE ${"%" + searchQuery + "%"}
       OR i.email ILIKE ${"%" + searchQuery + "%"}
    ORDER BY w.balance DESC
    LIMIT 100
  ` as WalletRow[]

  const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balance), 0)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Wallets</h1>
        <p className="text-muted-foreground mt-1">View investor wallet balances (read-only)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="admin-panel p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Balance</p>
              <p className="text-2xl font-bold text-foreground">
                ${totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
        <div className="admin-panel p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Wallet className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Wallets</p>
              <p className="text-2xl font-bold text-foreground">{wallets.filter((w) => !w.is_locked).length}</p>
            </div>
          </div>
        </div>
        <div className="admin-panel p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Wallet className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Average Balance</p>
              <p className="text-2xl font-bold text-foreground">
                ${wallets.length > 0 ? (totalBalance / wallets.length).toLocaleString("en-US", { minimumFractionDigits: 2 }) : "0.00"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-panel p-6">
        <form className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="Search by investor name or email..."
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Search
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Investor</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Email</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Balance</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {wallets.map((wallet) => (
                <tr key={wallet.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                  <td className="py-4 px-4 font-medium text-foreground">{wallet.full_name}</td>
                  <td className="py-4 px-4 text-muted-foreground">{wallet.email}</td>
                  <td className="py-4 px-4 text-center">
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${
                      wallet.is_locked
                        ? "bg-red-500/20 text-red-400 border-red-500/30"
                        : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    }`}>
                      {wallet.is_locked ? "Locked" : "Active"}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-primary">
                    ${Number(wallet.balance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-4 text-right text-muted-foreground text-sm">
                    {new Date(wallet.updated_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {wallets.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    No wallets found
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
