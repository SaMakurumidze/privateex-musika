import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { createSQLClient } from "@/lib/db"
import { assertCompanyId, assertPositiveNumber } from "@/lib/input-safety"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { companyId: rawCompanyId, shares, pricePerShare } = body
    const companyId = assertCompanyId(rawCompanyId)

    if (!companyId || !shares || shares < 1 || !pricePerShare) {
      return NextResponse.json({ error: "Invalid purchase data" }, { status: 400 })
    }

    const numShares = assertPositiveNumber(shares, "share quantity")
    const numPrice = assertPositiveNumber(pricePerShare, "price per share")
    const totalAmount = numShares * numPrice

    const sql = createSQLClient()

    // Generate IDs upfront
    const transactionId = `TXN-${session.id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    const certNumber = `CERT-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`

    // Step 1: Check wallet balance
    const walletRows = await sql`
      SELECT balance FROM wallets WHERE investor_id = ${session.id}
    `
    const wallet = walletRows[0]

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found. Please contact support." }, { status: 400 })
    }

    const currentBalance = Number.parseFloat(wallet.balance)
    if (currentBalance < totalAmount) {
      return NextResponse.json({
        error: `Insufficient wallet balance. You have $${currentBalance.toFixed(2)} but need $${totalAmount.toFixed(2)}.`
      }, { status: 400 })
    }

    // Step 2: Check company shares
    const companyRows = await sql`
      SELECT available_shares, company_name, registration_number, country_of_incorporation, share_class
      FROM companies WHERE company_id = ${companyId}
    `
    const company = companyRows[0]

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 400 })
    }

    if (company.available_shares < numShares) {
      return NextResponse.json({ error: "Not enough shares available" }, { status: 400 })
    }

    // Step 3: Deduct wallet balance
    await sql`
      UPDATE wallets
      SET balance = balance - ${totalAmount}, updated_at = NOW()
      WHERE investor_id = ${session.id}
    `

    // Step 4: Insert portfolio record
    const portfolioRows = await sql`
      INSERT INTO portfolio (
        user_id, transaction_id, company_name, company_id,
        shares_purchased, price_per_share, payment_method, status
      ) VALUES (
        ${session.id}, ${transactionId}, ${company.company_name}, ${companyId},
        ${numShares}, ${numPrice}, 'Wallet', 'completed'
      )
      RETURNING id
    `
    const portfolioRow = portfolioRows[0]

    // Step 5: Reduce available shares
    await sql`
      UPDATE companies
      SET available_shares = available_shares - ${numShares}
      WHERE company_id = ${companyId}
    `

    // Step 6: Get investor info for certificate
    const investorRows = await sql`
      SELECT full_name, email, id_passport FROM investors WHERE id = ${session.id}
    `
    const investor = investorRows[0]

    // Step 7: Insert certificate record (using actual schema columns)
    await sql`
      INSERT INTO certificates (
        certificate_number, transaction_id,
        investor_id, shareholder_name, shareholder_id_passport,
        company_id, company_name, company_registration_number, country_of_incorporation,
        share_class, shares_issued, price_per_share, total_amount
      ) VALUES (
        ${certNumber}, ${transactionId},
        ${session.id}, ${investor?.full_name || 'Investor'}, ${investor?.id_passport || ''},
        ${companyId}, ${company.company_name}, ${company.registration_number || ''}, ${company.country_of_incorporation || ''},
        ${company.share_class || 'Ordinary'}, ${numShares}, ${numPrice}, ${totalAmount}
      )
    `

    // Step 8: Read back new balance
    const updatedWalletRows = await sql`
      SELECT balance FROM wallets WHERE investor_id = ${session.id}
    `
    const updatedWallet = updatedWalletRows[0]

    return NextResponse.json({
      success: true,
      transactionId,
      certificateNumber: certNumber,
      message: "Purchase completed successfully. Your share certificate has been issued.",
      newBalance: Number.parseFloat(updatedWallet?.balance || "0"),
      investorName: investor?.full_name || "Investor",
      investorEmail: investor?.email || "",
    })
  } catch (error) {
    console.error("Purchase error:", error)
    const errorMessage =
      error instanceof Error ? error.message : "An error occurred during purchase"
    const status = errorMessage.startsWith("Invalid") ? 400 : 500
    return NextResponse.json({ error: errorMessage }, { status })
  }
}
