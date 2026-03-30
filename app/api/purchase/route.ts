import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { createSQLClient } from "@/lib/db"
import { assertCompanyId, assertPositiveNumber } from "@/lib/input-safety"

const SERVICE_FEE_RATE = 0.015
const TAX_RATE = 0.02

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      companyId: rawCompanyId,
      shares,
      pricePerShare,
      idPassport,
      phone,
      country,
      address,
    } = body
    const companyId = assertCompanyId(rawCompanyId)

    if (!companyId || !shares || shares < 1 || !pricePerShare) {
      return NextResponse.json({ error: "Invalid purchase data" }, { status: 400 })
    }

    const normalizedIdPassport = typeof idPassport === "string" ? idPassport.trim() : ""
    const normalizedPhone = typeof phone === "string" ? phone.trim() : ""
    const normalizedCountry = typeof country === "string" ? country.trim() : ""
    const normalizedAddress = typeof address === "string" ? address.trim() : ""

    if (!normalizedIdPassport || !normalizedPhone || !normalizedCountry || !normalizedAddress) {
      return NextResponse.json({ error: "Please complete all required identity fields." }, { status: 400 })
    }

    const idPassportRegex = /^[A-Za-z0-9-]{6,20}$/
    if (!idPassportRegex.test(normalizedIdPassport)) {
      return NextResponse.json(
        { error: "Invalid ID/Passport number. Must be 6-20 alphanumeric characters." },
        { status: 400 },
      )
    }

    const cleanPhone = normalizedPhone.replace(/[\s\-\(\)]/g, "")
    const phoneRegex = /^\+?[0-9]{7,15}$/
    if (!phoneRegex.test(cleanPhone)) {
      return NextResponse.json(
        { error: "Invalid phone number. Please enter a valid phone number with country code." },
        { status: 400 },
      )
    }

    const numShares = assertPositiveNumber(shares, "share quantity")
    const numPrice = assertPositiveNumber(pricePerShare, "price per share")
    const subtotal = numShares * numPrice
    const serviceFee = subtotal * SERVICE_FEE_RATE
    const tax = subtotal * TAX_RATE
    const totalAmount = subtotal + serviceFee + tax

    const sql = createSQLClient()

    await sql`
      CREATE TABLE IF NOT EXISTS purchase_charge_audit (
        id SERIAL PRIMARY KEY,
        transaction_id VARCHAR(120) NOT NULL UNIQUE,
        investor_id INTEGER NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
        investor_name VARCHAR(255) NOT NULL,
        investor_email VARCHAR(255),
        company_id VARCHAR(40) NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        shares_purchased NUMERIC(18, 6) NOT NULL,
        price_per_share NUMERIC(18, 6) NOT NULL,
        subtotal NUMERIC(18, 2) NOT NULL,
        service_fee NUMERIC(18, 2) NOT NULL,
        tax NUMERIC(18, 2) NOT NULL,
        total_amount NUMERIC(18, 2) NOT NULL,
        payment_method VARCHAR(40) NOT NULL DEFAULT 'Wallet',
        charged_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `

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
      SELECT available_shares, company_name, registration_number, country_of_incorporation, share_class, security_type
      FROM companies WHERE company_id = ${companyId}
    `
    const company = companyRows[0]

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 400 })
    }

    if (company.available_shares < numShares) {
      return NextResponse.json({ error: "Not enough shares available" }, { status: 400 })
    }

    // Step 2.5: Persist KYC profile details collected in checkout flow.
    await sql`
      UPDATE investors
      SET
        id_passport = ${normalizedIdPassport},
        phone = ${cleanPhone},
        country = ${normalizedCountry},
        address = ${normalizedAddress}
      WHERE id = ${session.id}
    `

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

    if (!portfolioRows[0]) {
      return NextResponse.json({ error: "Failed to record purchase" }, { status: 500 })
    }

    // Step 5: Reduce available shares; auto-delist if exhausted.
    await sql`
      UPDATE companies
      SET
        available_shares = GREATEST(available_shares - ${numShares}, 0),
        listing_status = CASE
          WHEN available_shares - ${numShares} <= 0 THEN 'delisted'
          ELSE listing_status
        END
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
        ${session.id}, ${investor?.full_name || "Investor"}, ${normalizedIdPassport},
        ${companyId}, ${company.company_name}, ${company.registration_number || ''}, ${company.country_of_incorporation || ''},
        ${company.security_type || company.share_class || "Ordinary"}, ${numShares}, ${numPrice}, ${totalAmount}
      )
    `

    // Step 8: Persist accounting audit trail for fee/tax charges.
    await sql`
      INSERT INTO purchase_charge_audit (
        transaction_id,
        investor_id,
        investor_name,
        investor_email,
        company_id,
        company_name,
        shares_purchased,
        price_per_share,
        subtotal,
        service_fee,
        tax,
        total_amount,
        payment_method
      ) VALUES (
        ${transactionId},
        ${session.id},
        ${investor?.full_name || "Investor"},
        ${investor?.email || null},
        ${companyId},
        ${company.company_name},
        ${numShares},
        ${numPrice},
        ${subtotal},
        ${serviceFee},
        ${tax},
        ${totalAmount},
        'Wallet'
      )
      ON CONFLICT (transaction_id) DO NOTHING
    `

    // Step 9: Read back new balance
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
      pricing: {
        subtotal,
        serviceFee,
        tax,
        totalAmount,
      },
    })
  } catch (error) {
    console.error("Purchase error:", error)
    const errorMessage =
      error instanceof Error ? error.message : "An error occurred during purchase"
    const status = errorMessage.startsWith("Invalid") ? 400 : 500
    return NextResponse.json({ error: errorMessage }, { status })
  }
}
