import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { createSQLClient } from "@/lib/db"
import { DashboardLayout } from "@/components/dashboard-layout"
import { DashboardSettingsForm } from "@/components/dashboard-settings-form"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const session = await getSession()

  if (!session) {
    redirect("/")
  }

  const sql = createSQLClient()
  const rows = await sql`
    SELECT phone, address
    FROM investors
    WHERE id = ${session.id}
    LIMIT 1
  `

  const profile = rows[0] || { phone: "", address: "" }

  return (
    <DashboardLayout user={session}>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-balance">Settings</h1>
          <p className="text-lg text-muted-foreground">Manage your profile and appearance preferences</p>
        </div>

        <DashboardSettingsForm initialPhone={profile.phone || ""} initialAddress={profile.address || ""} />
      </div>
    </DashboardLayout>
  )
}
