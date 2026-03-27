import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { createSQLClient } from "@/lib/db"

export const runtime = "nodejs"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

    const rows = await sql`
      SELECT COUNT(*)::int AS unread_count
      FROM investor_messages
      WHERE investor_id = ${session.id} AND is_read = FALSE
    `

    return NextResponse.json({
      unreadCount: Number(rows[0]?.unread_count || 0),
    })
  } catch (error) {
    console.error("Unread message count error:", error)
    return NextResponse.json({ error: "Failed to fetch unread count" }, { status: 500 })
  }
}
