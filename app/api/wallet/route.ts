import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { createSQLClient } from "@/lib/db"

export async function GET() {
  try {
    const session = await getSession()
    console.log("[v0] Wallet API - session:", session ? `id=${session.id}` : "null")

    if (!session) {
      return NextResponse.json({ error: "Unauthorized - please log in again" }, { status: 401 })
    }

    const sql = createSQLClient()
    const wallet = await sql`
      SELECT balance FROM wallets WHERE investor_id = ${session.id}
    `
    console.log("[v0] Wallet API - wallet result:", wallet)

    if (wallet.length === 0) {
      // Create wallet if it doesn't exist (for existing users)
      console.log("[v0] Wallet API - creating new wallet for investor:", session.id)
      await sql`
        INSERT INTO wallets (investor_id, balance)
        VALUES (${session.id}, 10000.00)
      `
      return NextResponse.json({ balance: 10000.00 })
    }

    const balance = Number.parseFloat(wallet[0].balance)
    console.log("[v0] Wallet API - returning balance:", balance)
    return NextResponse.json({ balance })
  } catch (error) {
    console.error("[v0] Wallet fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch wallet balance" }, { status: 500 })
  }
}
