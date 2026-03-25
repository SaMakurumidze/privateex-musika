import { type NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/admin-auth"
import { createSQLClient } from "@/lib/db"
import { asTrimmedString, assertPositiveNumber } from "@/lib/input-safety"

export async function POST(request: NextRequest) {
  try {
    await requirePermission("companies:create")
    
    const body = await request.json()
    const {
      company_name: rawCompanyName,
      price_per_share, 
      total_shares, 
      logo_url, 
      sector, 
      description,
      funding_round,
      security_type,
      return_rate,
      company_info_url
    } = body
    const company_name = asTrimmedString(rawCompanyName)

    if (!company_name || !price_per_share || !total_shares) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }
    const pricePerShare = assertPositiveNumber(price_per_share, "price per share")
    const totalShares = assertPositiveNumber(total_shares, "total shares")

    const sql = createSQLClient()
    
    // Generate company ID
    const companyId = `COMP-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`

    await sql`
      INSERT INTO companies (
        company_id,
        company_name,
        price_per_share,
        available_shares,
        total_shares,
        logo_url,
        sector,
        description,
        funding_round,
        security_type,
        return_rate,
        company_info_url,
        status,
        listing_status
      ) VALUES (
        ${companyId},
        ${company_name},
        ${pricePerShare},
        ${totalShares},
        ${totalShares},
        ${logo_url || null},
        ${sector || null},
        ${description || null},
        ${funding_round || null},
        ${security_type || null},
        ${return_rate || null},
        ${company_info_url || null},
        'pending',
        'unlisted'
      )
    `

    return NextResponse.json({ success: true, companyId })
  } catch (error) {
    const message = error instanceof Error ? error.message : "An error occurred"
    const status = message.includes("Unauthorized")
      ? 401
      : message.includes("Forbidden")
      ? 403
      : message.startsWith("Invalid")
      ? 400
      : 500
    return NextResponse.json({ error: message }, { status })
  }
}
