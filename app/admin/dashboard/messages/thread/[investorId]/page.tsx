import Link from "next/link"
import { redirect, notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getAdminSession, hasPermission } from "@/lib/admin-auth"
import { createSQLClient } from "@/lib/db"
import { ensureConversationMessagesTable } from "@/lib/conversation-messages"
import { AdminThreadReply } from "@/components/admin/admin-thread-reply"

type ThreadRow = {
  id: number
  sender_type: string
  subject: string | null
  body: string
  created_at: Date
  admin_name: string | null
}

export const dynamic = "force-dynamic"

export default async function AdminMessageThreadPage({
  params,
}: {
  params: Promise<{ investorId: string }>
}) {
  const admin = await getAdminSession()
  if (!admin) {
    redirect("/admin")
  }
  if (!hasPermission(admin.role, "investors:view")) {
    redirect("/admin/dashboard")
  }

  const { investorId: rawId } = await params
  const investorId = Number.parseInt(decodeURIComponent(rawId), 10)
  if (!Number.isInteger(investorId) || investorId < 1) {
    notFound()
  }

  const sql = createSQLClient()
  await ensureConversationMessagesTable(sql)

  const investors = await sql`
    SELECT id, full_name, email FROM investors WHERE id = ${investorId} LIMIT 1
  `
  if (investors.length === 0) {
    notFound()
  }
  const investor = investors[0] as { id: number; full_name: string; email: string }

  await sql`
    UPDATE conversation_messages
    SET read_by_admin_at = NOW()
    WHERE investor_id = ${investorId}
      AND sender_type = 'investor'
      AND read_by_admin_at IS NULL
  `

  const rows = (await sql`
    SELECT
      c.id,
      c.sender_type,
      c.subject,
      c.body,
      c.created_at,
      u.name AS admin_name
    FROM conversation_messages c
    LEFT JOIN users u ON u.id = c.admin_user_id
    WHERE c.investor_id = ${investorId}
    ORDER BY c.created_at ASC
  `) as ThreadRow[]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/admin/dashboard/messages"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to messaging
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Conversation</h1>
        <p className="mt-1 text-muted-foreground">
          {investor.full_name} · {investor.email}
        </p>
      </div>

      <div className="admin-panel max-h-[min(560px,70vh)] space-y-3 overflow-y-auto p-4">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages in this thread yet.</p>
        ) : (
          rows.map((row) => {
            const fromInvestor = row.sender_type === "investor"
            return (
              <div key={row.id} className={`flex ${fromInvestor ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    fromInvestor
                      ? "border border-border bg-background text-foreground"
                      : "bg-primary/15 text-foreground"
                  }`}
                >
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    {fromInvestor ? "Investor" : `Admin${row.admin_name ? ` · ${row.admin_name}` : ""}`}
                  </p>
                  {fromInvestor && row.subject ? (
                    <p className="mb-1 text-xs font-semibold text-foreground">{row.subject}</p>
                  ) : null}
                  <p className="whitespace-pre-wrap">{row.body}</p>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    {new Date(row.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <AdminThreadReply investorId={investorId} />
    </div>
  )
}
