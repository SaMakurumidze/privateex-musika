import { NextResponse } from "next/server"
import { requirePermission } from "@/lib/admin-auth"
import { createSQLClient } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ investorId: string }> }
) {
  try {
    await requirePermission("investors:reset_password")
    const { investorId } = await params
    const sql = createSQLClient()

    // Generate temporary password
    const tempPassword = `Temp${Math.random().toString(36).substring(2, 8).toUpperCase()}!`
    const hashedPassword = await bcrypt.hash(tempPassword, 10)

    await sql`
      UPDATE investors 
      SET password = ${hashedPassword}
      WHERE id = ${investorId}
    `

    return NextResponse.json({ 
      success: true, 
      message: "Password reset successfully",
      tempPassword 
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "An error occurred"
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
