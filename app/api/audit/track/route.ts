import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getAdminSession } from "@/lib/admin-auth"
import { createSQLClient } from "@/lib/db"
import { getClientIp, insertAuditLog, parseUserAgent, type AuditEventType } from "@/lib/audit-log"

const EVENT_TYPES = new Set<AuditEventType>(["page_view", "page_time", "feature_interaction"])

export async function POST(request: NextRequest) {
  try {
    const [investor, admin] = await Promise.all([getSession(), getAdminSession()])
    if (!investor && !admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Exclude super-admin records from the report scope.
    if (admin && admin.email.toLowerCase() === "superadmin@privateex.com") {
      return NextResponse.json({ success: true, ignored: true })
    }

    const body = (await request.json()) as {
      eventType?: string
      pagePath?: string
      featureName?: string
      durationSeconds?: number
      interactionMeta?: Record<string, unknown>
    }

    const eventType = (body.eventType || "").trim() as AuditEventType
    const pagePath = (body.pagePath || "").trim()
    const featureName = typeof body.featureName === "string" ? body.featureName.trim() : ""
    const durationSeconds = Number(body.durationSeconds)

    if (!EVENT_TYPES.has(eventType)) {
      return NextResponse.json({ error: "Invalid event type." }, { status: 400 })
    }
    if (!pagePath || pagePath.length > 512 || !pagePath.startsWith("/")) {
      return NextResponse.json({ error: "Invalid page path." }, { status: 400 })
    }

    const userAgent = request.headers.get("user-agent") || "unknown"
    const ipAddress = getClientIp(request.headers)
    const browserInfo = parseUserAgent(userAgent)
    const sql = createSQLClient()

    if (investor) {
      await insertAuditLog(sql, {
        actorType: "investor",
        actorId: investor.id,
        actorName: investor.full_name,
        actorEmail: investor.email,
        actorRole: investor.role || null,
        eventType,
        pagePath,
        featureName: featureName || null,
        durationSeconds:
          Number.isFinite(durationSeconds) && durationSeconds > 0
            ? Math.min(Math.round(durationSeconds), 24 * 60 * 60)
            : null,
        interactionMeta: body.interactionMeta ?? null,
        ipAddress,
        userAgent,
        browserName: browserInfo.browserName,
        browserVersion: browserInfo.browserVersion,
        osName: browserInfo.osName,
        deviceType: browserInfo.deviceType,
      })
    } else if (admin) {
      await insertAuditLog(sql, {
        actorType: "admin",
        actorId: admin.id,
        actorName: admin.name,
        actorEmail: admin.email,
        actorRole: admin.role || null,
        eventType,
        pagePath,
        featureName: featureName || null,
        durationSeconds:
          Number.isFinite(durationSeconds) && durationSeconds > 0
            ? Math.min(Math.round(durationSeconds), 24 * 60 * 60)
            : null,
        interactionMeta: body.interactionMeta ?? null,
        ipAddress,
        userAgent,
        browserName: browserInfo.browserName,
        browserVersion: browserInfo.browserVersion,
        osName: browserInfo.osName,
        deviceType: browserInfo.deviceType,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Audit track error:", error)
    return NextResponse.json({ error: "Failed to track activity." }, { status: 500 })
  }
}

