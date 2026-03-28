import { redirect } from "next/navigation"
import { getAdminSession, hasPermission, getPermissions } from "@/lib/admin-auth"
import { createSQLClient } from "@/lib/db"
import { CompaniesTable, type Company } from "@/components/admin/companies-table"
import { Plus, Search } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function AdminCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const admin = await getAdminSession()
  const params = await searchParams

  if (!admin) {
    redirect("/admin")
  }

  if (!hasPermission(admin.role, "companies:view")) {
    redirect("/admin/dashboard")
  }

  const sql = createSQLClient()
  const searchQuery = params.q || ""
  const statusFilter = params.status || "all"

  let companies
  if (statusFilter === "all") {
    companies = await sql`
      SELECT * FROM companies
      WHERE company_name ILIKE ${"%" + searchQuery + "%"}
         OR company_id ILIKE ${"%" + searchQuery + "%"}
      ORDER BY created_at DESC
    `
  } else {
    companies = await sql`
      SELECT * FROM companies
      WHERE (company_name ILIKE ${"%" + searchQuery + "%"}
         OR company_id ILIKE ${"%" + searchQuery + "%"})
        AND status = ${statusFilter}
      ORDER BY created_at DESC
    `
  }

  const permissions = getPermissions(admin.role)
  const canCreate = hasPermission(admin.role, "companies:create")
  const typedCompanies = companies as Company[]

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Companies</h1>
          <p className="text-muted-foreground mt-1">Manage company listings and approvals</p>
        </div>
        {canCreate && (
          <Link
            href="/admin/dashboard/companies/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Add Company
          </Link>
        )}
      </div>

      <div className="admin-panel p-6">
        <form className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="Search companies..."
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <label htmlFor="admin-companies-status" className="sr-only">
            Filter companies by approval status
          </label>
          <select
            id="admin-companies-status"
            name="status"
            defaultValue={statusFilter}
            className="px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Search
          </button>
        </form>

        <CompaniesTable companies={typedCompanies} permissions={permissions} />
      </div>
    </div>
  )
}
