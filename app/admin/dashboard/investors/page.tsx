import { redirect } from "next/navigation"
import { getAdminSession, hasPermission, getPermissions } from "@/lib/admin-auth"
import { createSQLClient } from "@/lib/db"
import { InvestorsTable, type Investor } from "@/components/admin/investors-table"
import { Search } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function AdminInvestorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const admin = await getAdminSession()
  const params = await searchParams

  if (!admin) {
    redirect("/admin")
  }

  if (!hasPermission(admin.role, "investors:view")) {
    redirect("/admin/dashboard")
  }

  const sql = createSQLClient()
  const searchQuery = params.q || ""
  const statusFilter = params.status || "all"

  let investors
  if (statusFilter === "all") {
    investors = await sql`
      SELECT i.*, w.balance as wallet_balance
      FROM investors i
      LEFT JOIN wallets w ON i.id = w.investor_id
      WHERE i.full_name ILIKE ${"%" + searchQuery + "%"}
         OR i.email ILIKE ${"%" + searchQuery + "%"}
         OR i.id_passport ILIKE ${"%" + searchQuery + "%"}
      ORDER BY i.created_at DESC
      LIMIT 100
    `
  } else {
    const isLocked = statusFilter === "locked"
    investors = await sql`
      SELECT i.*, w.balance as wallet_balance
      FROM investors i
      LEFT JOIN wallets w ON i.id = w.investor_id
      WHERE (i.full_name ILIKE ${"%" + searchQuery + "%"}
         OR i.email ILIKE ${"%" + searchQuery + "%"}
         OR i.id_passport ILIKE ${"%" + searchQuery + "%"})
        AND i.is_locked = ${isLocked}
      ORDER BY i.created_at DESC
      LIMIT 100
    `
  }

  const permissions = getPermissions(admin.role)
  const typedInvestors = investors as Investor[]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Investors</h1>
        <p className="text-muted-foreground mt-1">Manage investor accounts</p>
      </div>

      <div className="bg-card/50 backdrop-blur-xl border border-border rounded-2xl p-6">
        <form className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="Search by name, email, or ID..."
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            name="status"
            defaultValue={statusFilter}
            className="px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="locked">Locked</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Search
          </button>
        </form>

        <InvestorsTable investors={typedInvestors} permissions={permissions} />
      </div>
    </div>
  )
}
