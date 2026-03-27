import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { createSQLClient } from "@/lib/db"
import { ensureConversationMessagesTable } from "@/lib/conversation-messages"

const MAX_BODY = 8000
const MAX_SUBJECT = 255

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json()) as { subject?: string; message?: string }
    const subjectRaw = typeof body.subject === "string" ? body.subject.trim() : ""
    const messageRaw = typeof body.message === "string" ? body.message.trim() : ""

    if (!messageRaw) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 })
    }
    if (messageRaw.length > MAX_BODY) {
      return NextResponse.json({ error: `Message must be at most ${MAX_BODY} characters.` }, { status: 400 })
    }

    let subject = subjectRaw || "Message to PrivateEx Team"
    if (subject.length > MAX_SUBJECT) {
      return NextResponse.json({ error: "Subject is too long." }, { status: 400 })
    }

    const sql = createSQLClient()
    await ensureConversationMessagesTable(sql)

    await sql`
      INSERT INTO conversation_messages (
        investor_id,
        sender_type,
        admin_user_id,
        subject,
        body
      ) VALUES (
        ${session.id},
        'investor',
        NULL,
        ${subject},
        ${messageRaw}
      )
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Investor message send error:", error)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}
