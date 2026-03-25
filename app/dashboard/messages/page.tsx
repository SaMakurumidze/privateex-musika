import { redirect } from "next/navigation"
import { Mail } from "lucide-react"
import { getSession } from "@/lib/auth"
import { DashboardLayout } from "@/components/dashboard-layout"

export const dynamic = "force-dynamic"

export default async function MessagesPage() {
  const session = await getSession()

  if (!session) {
    redirect("/")
  }

  return (
    <DashboardLayout user={session}>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-balance">Messages</h1>
          <p className="text-lg text-muted-foreground">Stay updated with account notifications</p>
        </div>

        <div className="rounded-2xl border border-border bg-card/50 p-10 text-center">
          <Mail className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">No messages yet</h2>
          <p className="mt-2 text-muted-foreground">
            You will see platform alerts, investment updates, and important notices here.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}
