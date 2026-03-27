import { NextResponse } from "next/server"
import { getAdminSession, hasPermission } from "@/lib/admin-auth"
import { createSQLClient } from "@/lib/db"
import { ensureConversationMessagesTable } from "@/lib/conversation-messages"
import { assertIntegerId } from "@/lib/input-safety"

const MAX_BODY = 8000

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const admin = await getAdminSession()
    if (!admin || !hasPermission(admin.role, "investors:view")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json()) as {
      investorId?: number | string
      message?: string
    }

    const investorId = assertIntegerId(body.investorId, "investor")
    const message = typeof body.message === "string" ? body.message.trim() : ""

    if (!investorId || investorId < 1) {
      return NextResponse.json({ error: "Invalid investor." }, { status: 400 })
    }
    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 })
    }
    if (message.length > MAX_BODY) {
      return NextResponse.json({ error: "Message is too long." }, { status: 400 })
    }

    const sql = createSQLClient()
    await ensureConversationMessagesTable(sql)

    const exists = await sql`
      SELECT id FROM investors WHERE id = ${investorId} LIMIT 1
    `
    if (exists.length === 0) {
      return NextResponse.json({ error: "Investor not found." }, { status: 404 })
    }

    await sql`
      INSERT INTO conversation_messages (
        investor_id,
        sender_type,
        admin_user_id,
        subject,
        body
      ) VALUES (
        ${investorId},
        'admin',
        ${admin.id},
        NULL,
        ${message}
      )
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to send reply"
    const status = msg.startsWith("Invalid") ? 400 : 500
    console.error("Admin reply error:", error)
    return NextResponse.json({ error: msg }, { status })
  }
}
