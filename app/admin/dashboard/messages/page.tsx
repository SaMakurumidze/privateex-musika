import { redirect } from "next/navigation"
import { Mail } from "lucide-react"
import { getAdminSession, hasPermission } from "@/lib/admin-auth"
import { createSQLClient } from "@/lib/db"
import { AdminMessagesPanel } from "@/components/admin/admin-messages-panel"

type InvestorOption = {
  id: number
  full_name: string
  email: string
}

type RecentMessageRow = {
  id: number
  subject: string
  body: string
  created_at: Date
  full_name: string
  email: string
}

export const dynamic = "force-dynamic"

export default async function AdminMessagesPage() {
  const admin = await getAdminSession()
  if (!admin) {
    redirect("/admin")
  }
  if (!hasPermission(admin.role, "investors:view")) {
    redirect("/admin/dashboard")
  }

  const sql = createSQLClient()
  await sql`
    CREATE TABLE IF NOT EXISTS investor_messages (
      id SERIAL PRIMARY KEY,
      investor_id INTEGER NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
      subject VARCHAR(255) NOT NULL,
      body TEXT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `

  const [investorsRows, recentRows] = await Promise.all([
    sql`
      SELECT id, full_name, email
      FROM investors
      ORDER BY full_name ASC
      LIMIT 500
    `,
    sql`
      SELECT
        m.id,
        m.subject,
        m.body,
        m.created_at,
        i.full_name,
        i.email
      FROM investor_messages m
      JOIN investors i ON i.id = m.investor_id
      ORDER BY m.created_at DESC
      LIMIT 20
    `,
  ])

  const investors = investorsRows as InvestorOption[]
  const recent = recentRows as RecentMessageRow[]

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-foreground">Investor Messaging</h1>
        <p className="text-muted-foreground">Send updates and announcements to individual or all users.</p>
      </div>

      <AdminMessagesPanel investors={investors} />

      <section className="rounded-2xl border border-border bg-card/50 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Recent Sent Messages</h2>
        </div>

        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages have been sent yet.</p>
        ) : (
          <div className="space-y-4">
            {recent.map((row) => (
              <article key={row.id} className="rounded-xl border border-border bg-background/50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-foreground">{row.subject}</h3>
                  <span className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  To: {row.full_name} ({row.email})
                </p>
                <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-foreground">{row.body}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
