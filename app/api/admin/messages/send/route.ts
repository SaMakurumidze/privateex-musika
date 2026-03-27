import { NextResponse } from "next/server"
import { requirePermission } from "@/lib/admin-auth"
import { createSQLClient } from "@/lib/db"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    await requirePermission("investors:view")
    const body = (await request.json()) as {
      recipientType?: "all" | "individual"
      investorId?: number | string
      subject?: string
      message?: string
    }

    const recipientType = body.recipientType === "individual" ? "individual" : "all"
    const subject = typeof body.subject === "string" ? body.subject.trim() : ""
    const message = typeof body.message === "string" ? body.message.trim() : ""
    const investorId =
      typeof body.investorId === "number"
        ? body.investorId
        : typeof body.investorId === "string"
          ? Number.parseInt(body.investorId, 10)
          : NaN

    if (!subject || !message) {
      return NextResponse.json({ error: "Subject and message are required." }, { status: 400 })
    }

    if (subject.length > 255) {
      return NextResponse.json({ error: "Subject is too long (max 255 characters)." }, { status: 400 })
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

    if (recipientType === "individual") {
      if (!Number.isInteger(investorId) || investorId < 1) {
        return NextResponse.json({ error: "Please select a valid investor." }, { status: 400 })
      }

      const exists = await sql`
        SELECT id FROM investors WHERE id = ${investorId} LIMIT 1
      `
      if (exists.length === 0) {
        return NextResponse.json({ error: "Investor not found." }, { status: 404 })
      }

      await sql`
        INSERT INTO investor_messages (investor_id, subject, body)
        VALUES (${investorId}, ${subject}, ${message})
      `

      return NextResponse.json({ success: true, sentTo: 1, scope: "individual" })
    }

    const inserted = await sql`
      INSERT INTO investor_messages (investor_id, subject, body)
      SELECT i.id, ${subject}, ${message}
      FROM investors i
      RETURNING id
    `

    return NextResponse.json({
      success: true,
      sentTo: inserted.length,
      scope: "all",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send message"
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
