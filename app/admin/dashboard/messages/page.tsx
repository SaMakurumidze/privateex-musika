import Link from "next/link"
import { redirect } from "next/navigation"
import { Mail } from "lucide-react"
import { getAdminSession, hasPermission } from "@/lib/admin-auth"
import { createSQLClient } from "@/lib/db"
import { AdminMessagesPanel } from "@/components/admin/admin-messages-panel"
import { ensureConversationMessagesTable } from "@/lib/conversation-messages"

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

type InboxRow = {
  investor_id: number
  full_name: string
  email: string
  last_message_at: Date
  unread_from_investor: string
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
  await ensureConversationMessagesTable(sql)

  const [investorsRows, recentRows, inboxRows] = await Promise.all([
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
    sql`
      SELECT
        i.id AS investor_id,
        i.full_name,
        i.email,
        MAX(c.created_at) AS last_message_at,
        SUM(
          CASE
            WHEN c.sender_type = 'investor' AND c.read_by_admin_at IS NULL THEN 1
            ELSE 0
          END
        )::text AS unread_from_investor
      FROM investors i
      INNER JOIN conversation_messages c ON c.investor_id = i.id
      GROUP BY i.id, i.full_name, i.email
      ORDER BY last_message_at DESC
      LIMIT 200
    `,
  ])

  const investors = investorsRows as InvestorOption[]
  const recent = recentRows as RecentMessageRow[]
  const inbox = inboxRows as InboxRow[]

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-foreground">Investor Messaging</h1>
        <p className="text-muted-foreground">
          Send announcements, read investor messages, and reply in each conversation thread.
        </p>
      </div>

      <AdminMessagesPanel investors={investors} />

      <section className="admin-panel p-6">
        <div className="mb-4 flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Support inbox</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Investors who have contacted admins appear here. Open a thread to read and reply.
        </p>

        {inbox.length === 0 ? (
          <p className="text-sm text-muted-foreground">No investor messages yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Investor</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Last activity</th>
                  <th className="px-3 py-2 font-medium">Unread</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {inbox.map((row) => {
                  const unread = Number(row.unread_from_investor || 0)
                  return (
                    <tr key={row.investor_id} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-3 font-medium text-foreground">{row.full_name}</td>
                      <td className="px-3 py-3 text-muted-foreground">{row.email}</td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {new Date(row.last_message_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-3">
                        {unread > 0 ? (
                          <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                            {unread > 99 ? "99+" : unread}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          href={`/admin/dashboard/messages/thread/${row.investor_id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          Open thread
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-panel p-6">
        <div className="mb-4 flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Recent broadcast / notice messages</h2>
        </div>

        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No announcement messages have been sent yet.</p>
        ) : (
          <div className="space-y-4">
            {recent.map((row) => (
              <article key={row.id} className="admin-panel p-4">
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
