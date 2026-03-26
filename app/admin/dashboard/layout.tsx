import React from "react"
import { redirect } from "next/navigation"
import { getAdminSession, getPermissions } from "@/lib/admin-auth"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { InactivityLogout } from "@/components/inactivity-logout"

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await getAdminSession()

  if (!admin) {
    redirect("/admin")
  }

  const permissions = getPermissions(admin.role)

  return (
    <div className="min-h-screen bg-background">
      <InactivityLogout logoutEndpoint="/api/admin/auth/logout" redirectTo="/admin" />
      <AdminSidebar
        admin={{
          name: admin.name,
          role: admin.role,
          email: admin.email,
        }}
        permissions={permissions}
      />
      <main className="ml-64 p-8">
        {children}
      </main>
    </div>
  )
}
