import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { createSQLClient } from "@/lib/db"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ensureConversationMessagesTable } from "@/lib/conversation-messages"
import { InvestorMessagesView, type AnnouncementItem, type ConversationItem } from "@/components/investor-messages-view"

export const dynamic = "force-dynamic"

export default async function MessagesPage() {
  const session = await getSession()

  if (!session) {
    redirect("/")
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

  const [announcementRows, conversationRows] = await Promise.all([
    sql`
      SELECT id, subject, body, created_at
      FROM investor_messages
      WHERE investor_id = ${session.id}
      ORDER BY created_at DESC
    `,
    sql`
      SELECT
        c.id,
        c.sender_type,
        c.subject,
        c.body,
        c.created_at,
        u.name AS admin_name
      FROM conversation_messages c
      LEFT JOIN users u ON u.id = c.admin_user_id
      WHERE c.investor_id = ${session.id}
      ORDER BY c.created_at ASC
    `,
  ])

  await sql`
    UPDATE investor_messages
    SET is_read = TRUE
    WHERE investor_id = ${session.id} AND is_read = FALSE
  `
  await sql`
    UPDATE conversation_messages
    SET read_by_investor_at = NOW()
    WHERE investor_id = ${session.id}
      AND sender_type = 'admin'
      AND read_by_investor_at IS NULL
  `

  const announcements: AnnouncementItem[] = (announcementRows as { id: number; subject: string; body: string; created_at: Date }[]).map(
    (row) => ({
      id: row.id,
      subject: row.subject,
      body: row.body,
      created_at: new Date(row.created_at).toISOString(),
    }),
  )

  const conversation: ConversationItem[] = (
    conversationRows as {
      id: number
      sender_type: string
      subject: string | null
      body: string
      created_at: Date
      admin_name: string | null
    }[]
  ).map((row) => ({
    id: row.id,
    sender_type: row.sender_type === "admin" ? "admin" : "investor",
    subject: row.subject,
    body: row.body,
    admin_name: row.admin_name,
    created_at: new Date(row.created_at).toISOString(),
  }))

  return (
    <DashboardLayout user={session}>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-balance">Messages</h1>
          <p className="text-lg text-muted-foreground">Stay updated and reach the PrivateEx team</p>
        </div>

        <InvestorMessagesView announcements={announcements} conversation={conversation} />
      </div>
    </DashboardLayout>
  )
}
