import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { createSQLClient } from "@/lib/db"

/** Same pattern as purchase route — exclude registration placeholders from pre-fill */
const ID_PASSPORT_REGEX = /^[A-Za-z0-9-]{6,20}$/

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = createSQLClient()
    const rows = await sql`
      SELECT id_passport, phone, country, address
      FROM investors
      WHERE id = ${session.id}
      LIMIT 1
    `

    const row = rows[0]
    if (!row) {
      return NextResponse.json({
        idPassport: "",
        phone: "",
        country: "",
        address: "",
      })
    }

    const rawId = typeof row.id_passport === "string" ? row.id_passport.trim() : ""
    const idPassport =
      rawId && !rawId.startsWith("PENDING-") && ID_PASSPORT_REGEX.test(rawId) ? rawId : ""

    const phone = typeof row.phone === "string" ? row.phone.trim() : ""
    const country = typeof row.country === "string" ? row.country.trim() : ""
    const address = typeof row.address === "string" ? row.address.trim() : ""

    return NextResponse.json({ idPassport, phone, country, address })
  } catch (error) {
    console.error("checkout-profile GET:", error)
    return NextResponse.json({ error: "Failed to load checkout profile" }, { status: 500 })
  }
}
