import { type NextRequest, NextResponse } from "next/server"
import { createSQLClient } from "@/lib/db"
import { finalizeAuthorizedInvestment, verifyAbilityWebhookSignature } from "@/app/api/purchase/route"

type AbilityWebhookPayload = {
  investment_request_id?: string
  ability_reference_id?: string
  status?: "authorized" | "rejected" | string
  timestamp?: string
  user_id?: number | string
  company_id?: string
  total_amount?: number | string
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get("x-ability-signature")
  const apiKeyHeader = request.headers.get("x-ability-key")
  const configuredApiKey = process.env.PRIVATEEX_API_KEY

  const signatureOk = verifyAbilityWebhookSignature(rawBody, signature)
  const apiKeyOk = Boolean(configuredApiKey && apiKeyHeader && apiKeyHeader === configuredApiKey)
  if (!signatureOk && !apiKeyOk) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 })
  }

  let body: AbilityWebhookPayload
  try {
    body = JSON.parse(rawBody) as AbilityWebhookPayload
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 })
  }

  const requestId = String(body.investment_request_id || "").trim()
  const abilityReferenceId = String(body.ability_reference_id || "").trim()
  const status = String(body.status || "").trim().toLowerCase()
  const timestamp = String(body.timestamp || "").trim()
  const userId = typeof body.user_id !== "undefined" ? Number(body.user_id) : null
  const companyId = typeof body.company_id === "string" ? body.company_id.trim() : null
  const totalAmount = typeof body.total_amount !== "undefined" ? Number(body.total_amount) : null

  if (!requestId || !abilityReferenceId || !status) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 })
  }
  if (!timestamp || Number.isNaN(Date.parse(timestamp))) {
    return NextResponse.json({ error: "Invalid timestamp." }, { status: 400 })
  }
  if (!["authorized", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Unsupported status." }, { status: 400 })
  }

  const sql = createSQLClient()
  const rows = await sql`
    SELECT user_id, company_id, total_amount, status
    FROM investment_requests
    WHERE investment_request_id = ${requestId}::uuid
      AND ability_reference_id = ${abilityReferenceId}::uuid
    LIMIT 1
  `
  const req = rows[0]
  // If Ability sends data-matching fields, enforce strict parity.
  if (userId !== null && Number(req.user_id) !== userId) {
    return NextResponse.json({ error: "Webhook payload mismatch: user_id" }, { status: 400 })
  }
  if (companyId !== null && String(req.company_id) !== companyId) {
    return NextResponse.json({ error: "Webhook payload mismatch: company_id" }, { status: 400 })
  }
  if (totalAmount !== null && Number(req.total_amount) !== totalAmount) {
    return NextResponse.json({ error: "Webhook payload mismatch: total_amount" }, { status: 400 })
  }

  if (!req) {
    return NextResponse.json({ error: "Unknown investment request." }, { status: 404 })
  }

  if (String(req.status) === "authorized" || String(req.status) === "rejected") {
    return NextResponse.json({ success: true, idempotent: true })
  }

  if (status === "rejected") {
    await sql`
      UPDATE investment_requests
      SET status = 'rejected', updated_at = NOW()
      WHERE investment_request_id = ${requestId}::uuid
    `
    return NextResponse.json({ success: true, status: "rejected" })
  }

  try {
    const outcome = await finalizeAuthorizedInvestment({
      investmentRequestId: requestId,
      abilityReferenceId,
      userId: Number(req.user_id),
      companyId: String(req.company_id),
      totalAmount: Number(req.total_amount),
    })
    return NextResponse.json({ success: true, status: "authorized", idempotent: outcome.alreadyProcessed })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Finalization failed."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

