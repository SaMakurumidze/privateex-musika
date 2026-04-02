import React from "react"
import { redirect } from "next/navigation"
import { getAdminSession, getPermissions } from "@/lib/admin-auth"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { InactivityLogout } from "@/components/inactivity-logout"
import { AdminThemeSync } from "@/components/admin/admin-theme-sync"
import { ActivityTracker } from "@/components/activity-tracker"

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
    <div data-admin-shell="true" className="min-h-screen bg-background">
      <AdminThemeSync />
      <InactivityLogout logoutEndpoint="/api/admin/auth/logout" redirectTo="/admin" />
      <ActivityTracker scope="admin" />
      <AdminSidebar
        admin={{
          name: admin.name,
          role: admin.role,
          email: admin.email,
        }}
        permissions={permissions}
      />
      <main className="admin-main-wrap ml-64 flex min-h-screen flex-col bg-background">
        <div className="flex-1 p-8">{children}</div>
      </main>
    </div>
  )
}
