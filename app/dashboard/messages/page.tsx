import { redirect } from "next/navigation"
import { Mail } from "lucide-react"
import { getSession } from "@/lib/auth"
import { createSQLClient } from "@/lib/db"
import { DashboardLayout } from "@/components/dashboard-layout"

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

  const messages = await sql`
    SELECT id, subject, body, is_read, created_at
    FROM investor_messages
    WHERE investor_id = ${session.id}
    ORDER BY created_at DESC
  `

  return (
    <DashboardLayout user={session}>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-balance">Messages</h1>
          <p className="text-lg text-muted-foreground">Stay updated with account notifications</p>
        </div>

        {messages.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card/50 p-10 text-center">
            <Mail className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="text-xl font-semibold">No messages yet</h2>
            <p className="mt-2 text-muted-foreground">
              You will see platform alerts, investment updates, and important notices here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <article key={message.id} className="rounded-2xl border border-border bg-card/50 p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">{message.subject}</h2>
                  <span className="text-xs text-muted-foreground">
                    {new Date(message.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">{message.body}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
