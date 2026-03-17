import { redirect } from "next/navigation"
import { getAdminSession, hasPermission, getPermissions } from "@/lib/admin-auth"
import { createSQLClient } from "@/lib/db"
import { DirectorsTable, type Director } from "@/components/admin/directors-table"
import { Plus, Search } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function AdminDirectorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const admin = await getAdminSession()
  const params = await searchParams

  if (!admin) {
    redirect("/admin")
  }

  if (!hasPermission(admin.role, "directors:view")) {
    redirect("/admin/dashboard")
  }

  const sql = createSQLClient()
  const searchQuery = params.q || ""

  const directorsQuery = await sql`
    SELECT 
      d.id,
      d.full_name,
      d.email,
      d.phone,
      d.position,
      d.company_id,
      c.company_name,
      d.created_at
    FROM directors d
    LEFT JOIN companies c ON d.company_id = c.company_id
    WHERE d.full_name ILIKE ${"%" + searchQuery + "%"}
       OR d.email ILIKE ${"%" + searchQuery + "%"}
       OR c.company_name ILIKE ${"%" + searchQuery + "%"}
    ORDER BY d.created_at DESC
    LIMIT 100
  `

  const directors = directorsQuery as Director[]

  const permissions = getPermissions(admin.role)
  const canCreate = hasPermission(admin.role, "directors:create")

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Directors</h1>
          <p className="text-muted-foreground mt-1">Manage company directors</p>
        </div>
        {canCreate && (
          <Link
            href="/admin/dashboard/directors/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Add Director
          </Link>
        )}
      </div>

      <div className="bg-card/50 backdrop-blur-xl border border-border rounded-2xl p-6">
        <form className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="Search by name, email, or company..."
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

        <DirectorsTable directors={directors} permissions={permissions} />
      </div>
    </div>
  )
}
