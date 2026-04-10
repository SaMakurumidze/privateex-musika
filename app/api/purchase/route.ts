import { randomUUID, createHmac } from "crypto"
import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { createSQLClient, withTransaction } from "@/lib/db"
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

    const normalizedIdPassportInput = typeof idPassport === "string" ? idPassport.trim() : ""
    const normalizedIdPassport = normalizedIdPassportInput.toUpperCase()
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
    await ensureInvestmentRequestsTable(sql)

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

    // Step 2.5: Prevent two different investor accounts from sharing one ID/Passport.
    const duplicateIdRows = await sql`
      SELECT id
      FROM investors
      WHERE id <> ${session.id}
        AND UPPER(TRIM(id_passport)) = ${normalizedIdPassport}
      LIMIT 1
    `
    if (duplicateIdRows.length > 0) {
      return NextResponse.json(
        { error: "This National ID/Passport number is already linked to another account." },
        { status: 409 },
      )
    }

    // Persist KYC profile details collected in checkout flow.
    await sql`
      UPDATE investors
      SET
        id_passport = ${normalizedIdPassport},
        phone = ${cleanPhone},
        country = ${normalizedCountry},
        address = ${normalizedAddress}
      WHERE id = ${session.id}
    `

    // Identity synchronization requirement:
    // company_id must match the identifier Ability knows for this company.
    const abilitySync = await verifyAbilityCompanyIdentity(companyId)
    if (!abilitySync.ok) {
      return NextResponse.json({ error: abilitySync.error }, { status: 400 })
    }

    const investmentRequestId = randomUUID()
    await sql`
      INSERT INTO investment_requests (
        investment_request_id,
        user_id,
        company_id,
        share_quantity,
        share_price,
        total_amount,
        status
      ) VALUES (
        ${investmentRequestId}::uuid,
        ${session.id},
        ${companyId},
        ${numShares},
        ${numPrice},
        ${totalAmount},
        'pending_authorization'
      )
    `

    const abilityRequest = await requestAbilityAuthorization({
      investment_request_id: investmentRequestId,
      user_id: String(session.id),
      company_id: companyId,
      share_quantity: numShares,
      total_amount: totalAmount,
      currency: "USD",
      origin: "privateex",
    })

    if (!abilityRequest.ok) {
      await sql`
        UPDATE investment_requests
        SET status = 'ability_request_failed', updated_at = NOW()
        WHERE investment_request_id = ${investmentRequestId}::uuid
      `
      return NextResponse.json({ error: abilityRequest.error }, { status: 502 })
    }

    await sql`
      UPDATE investment_requests
      SET
        ability_reference_id = ${abilityRequest.ability_reference_id}::uuid,
        status = ${abilityRequest.status},
        updated_at = NOW()
      WHERE investment_request_id = ${investmentRequestId}::uuid
    `

    return NextResponse.json({
      success: true,
      investmentRequestId,
      abilityReferenceId: abilityRequest.ability_reference_id,
      message: "Your investment request has been sent to Ability for authorization.",
      pricing: {
        subtotal,
        serviceFee,
        tax,
        totalAmount,
      },
    })
  } catch (error) {
    const dbError = error as { code?: string; constraint?: string }
    if (dbError.code === "23505" && dbError.constraint?.includes("id_passport")) {
      return NextResponse.json(
        { error: "This National ID/Passport number is already linked to another account." },
        { status: 409 },
      )
    }

    console.error("Purchase error:", error)
    const errorMessage =
      error instanceof Error ? error.message : "An error occurred during purchase"
    const status = errorMessage.startsWith("Invalid") ? 400 : 500
    return NextResponse.json({ error: errorMessage }, { status })
  }
}

export async function finalizeAuthorizedInvestment(input: {
  investmentRequestId: string
  abilityReferenceId: string
  userId: number
  companyId: string
  totalAmount: number
}) {
  return withTransaction(async (sql) => {
    await ensureInvestmentRequestsTable(sql)
    await ensurePurchaseChargeAuditTable(sql)

    const requestRows = await sql`
      SELECT
        investment_request_id,
        user_id,
        company_id,
        share_quantity,
        share_price,
        total_amount,
        status
      FROM investment_requests
      WHERE investment_request_id = ${input.investmentRequestId}::uuid
        AND ability_reference_id = ${input.abilityReferenceId}::uuid
      LIMIT 1
    `
    const req = requestRows[0]
    if (!req) {
      throw new Error("Investment request not found.")
    }
    if (Number(req.user_id) !== input.userId || String(req.company_id) !== input.companyId) {
      throw new Error("Data mismatch on authorization payload.")
    }
    if (Number(req.total_amount) !== Number(input.totalAmount)) {
      throw new Error("Data mismatch on amount.")
    }

    if (req.status === "authorized") {
      return { alreadyProcessed: true }
    }
    if (req.status === "rejected") {
      return { alreadyProcessed: true }
    }

    const companyRows = await sql`
      SELECT available_shares, company_name, registration_number, country_of_incorporation, share_class, security_type
      FROM companies
      WHERE company_id = ${input.companyId}
      LIMIT 1
    `
    const company = companyRows[0]
    if (!company) {
      throw new Error("Company not found.")
    }
    if (Number(company.available_shares) < Number(req.share_quantity)) {
      throw new Error("Not enough shares available.")
    }

    const investorRows = await sql`
      SELECT full_name, email, id_passport FROM investors WHERE id = ${input.userId} LIMIT 1
    `
    const investor = investorRows[0]
    if (!investor) {
      throw new Error("Investor not found.")
    }

    const txId = `ABILITY-${String(input.investmentRequestId).slice(0, 12).toUpperCase()}`
    const certNumber = `CERT-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`

    const existing = await sql`
      SELECT id FROM portfolio WHERE transaction_id = ${txId} LIMIT 1
    `
    if (existing.length === 0) {
      await sql`
        INSERT INTO portfolio (
          user_id, transaction_id, company_name, company_id,
          shares_purchased, price_per_share, payment_method, status
        ) VALUES (
          ${input.userId}, ${txId}, ${company.company_name}, ${input.companyId},
          ${req.share_quantity}, ${req.share_price}, 'Ability Wallet', 'completed'
        )
      `

      await sql`
        UPDATE companies
        SET
          available_shares = GREATEST(available_shares - ${req.share_quantity}, 0),
          listing_status = CASE
            WHEN available_shares - ${req.share_quantity} <= 0 THEN 'delisted'
            ELSE listing_status
          END
        WHERE company_id = ${input.companyId}
      `

      await sql`
        INSERT INTO certificates (
          certificate_number, transaction_id,
          investor_id, shareholder_name, shareholder_id_passport,
          company_id, company_name, company_registration_number, country_of_incorporation,
          share_class, shares_issued, price_per_share, total_amount
        ) VALUES (
          ${certNumber}, ${txId},
          ${input.userId}, ${investor.full_name || "Investor"}, ${investor.id_passport || ""},
          ${input.companyId}, ${company.company_name}, ${company.registration_number || ''}, ${company.country_of_incorporation || ''},
          ${company.security_type || company.share_class || "Ordinary"}, ${req.share_quantity}, ${req.share_price}, ${req.total_amount}
        )
      `

      await sql`
        INSERT INTO purchase_charge_audit (
          transaction_id, investor_id, investor_name, investor_email, company_id, company_name,
          shares_purchased, price_per_share, subtotal, service_fee, tax, total_amount, payment_method
        ) VALUES (
          ${txId}, ${input.userId}, ${investor.full_name || "Investor"}, ${investor.email || null},
          ${input.companyId}, ${company.company_name}, ${req.share_quantity}, ${req.share_price},
          ${req.total_amount}, 0, 0, ${req.total_amount}, 'Ability Wallet'
        )
        ON CONFLICT (transaction_id) DO NOTHING
      `
    }

    await sql`
      UPDATE investment_requests
      SET status = 'authorized', settled_at = NOW(), updated_at = NOW()
      WHERE investment_request_id = ${input.investmentRequestId}::uuid
    `

    return { alreadyProcessed: false }
  })
}

async function ensureInvestmentRequestsTable(sql: ReturnType<typeof createSQLClient>) {
  await sql`
    CREATE TABLE IF NOT EXISTS investment_requests (
      investment_request_id UUID PRIMARY KEY,
      user_id INTEGER NOT NULL,
      company_id VARCHAR(40) NOT NULL,
      share_quantity INTEGER NOT NULL,
      share_price DECIMAL(18,2) NOT NULL,
      total_amount DECIMAL(18,2) NOT NULL,
      ability_reference_id UUID,
      status VARCHAR(64) NOT NULL DEFAULT 'pending_authorization',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      settled_at TIMESTAMP
    )
  `
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_investment_requests_ability_reference
      ON investment_requests (ability_reference_id)
      WHERE ability_reference_id IS NOT NULL
  `
}

async function ensurePurchaseChargeAuditTable(sql: ReturnType<typeof createSQLClient>) {
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
}

type AbilityRequestPayload = {
  investment_request_id: string
  user_id: string
  company_id: string
  share_quantity: number
  total_amount: number
  currency: "USD"
  origin: "privateex"
}

async function requestAbilityAuthorization(payload: AbilityRequestPayload) {
  const baseUrl = process.env.ABILITY_API_BASE_URL
  const apiKey = process.env.PRIVATEEX_API_KEY || process.env.ABILITY_API_KEY
  if (!baseUrl || !apiKey) {
    return { ok: false as const, error: "Ability integration is not configured." }
  }

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/investments/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-privateex-key": apiKey,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  })

  if (!res.ok) {
    return { ok: false as const, error: "Ability request failed. Please try again." }
  }

  const data = (await res.json()) as {
    status?: string
    ability_reference_id?: string
  }
  if (data.status !== "pending_authorization" || !data.ability_reference_id) {
    return { ok: false as const, error: "Invalid Ability response." }
  }

  return {
    ok: true as const,
    status: data.status,
    ability_reference_id: data.ability_reference_id,
  }
}

async function verifyAbilityCompanyIdentity(companyId: string) {
  const baseUrl = process.env.ABILITY_API_BASE_URL
  const apiKey = process.env.PRIVATEEX_API_KEY || process.env.ABILITY_API_KEY
  if (!baseUrl || !apiKey) {
    return { ok: false as const, error: "Ability integration is not configured." }
  }

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/companies/${encodeURIComponent(companyId)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  })
  if (!res.ok) {
    return { ok: false as const, error: "Company identifier mismatch with Ability." }
  }

  const data = (await res.json()) as { company_id?: string }
  if (!data.company_id || data.company_id !== companyId) {
    return { ok: false as const, error: "Company identifier mismatch with Ability." }
  }
  return { ok: true as const }
}

export function verifyAbilityWebhookSignature(rawBody: string, signatureHeader: string | null) {
  const secret = process.env.PRIVATEEX_WEBHOOK_SECRET || process.env.PRIVATEEX_API_KEY
  if (!secret || !signatureHeader) return false
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex")
  return signatureHeader === expected
}
