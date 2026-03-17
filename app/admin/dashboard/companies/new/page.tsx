import { redirect } from "next/navigation"
import { getAdminSession, hasPermission } from "@/lib/admin-auth"
import { CompanyForm } from "@/components/admin/company-form"

export default async function NewCompanyPage() {
  const admin = await getAdminSession()

  if (!admin) {
    redirect("/admin")
  }

  if (!hasPermission(admin.role, "companies:create")) {
    redirect("/admin/dashboard/companies")
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Add New Company</h1>
        <p className="text-muted-foreground mt-1">Create a new company listing</p>
      </div>

      <CompanyForm />
    </div>
  )
}
