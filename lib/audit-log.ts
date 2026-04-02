import type { NeonQueryFunction } from "@neondatabase/serverless"

type BrowserInfo = {
  browserName: string
  browserVersion: string
  osName: string
  deviceType: "desktop" | "mobile" | "tablet" | "bot" | "unknown"
}

export type AuditActorType = "investor" | "admin"
export type AuditEventType = "page_view" | "page_time" | "feature_interaction"

export type AuditLogInsert = {
  actorType: AuditActorType
  actorId: number
  actorName: string
  actorEmail: string
  actorRole: string | null
  eventType: AuditEventType
  pagePath: string
  featureName?: string | null
  durationSeconds?: number | null
  interactionMeta?: Record<string, unknown> | null
  ipAddress: string
  userAgent: string
  browserName: string
  browserVersion: string
  osName: string
  deviceType: string
}

export async function ensureAuditLogTable(sql: NeonQueryFunction<false, false>) {
  await sql`
    CREATE TABLE IF NOT EXISTS activity_audit_logs (
      id BIGSERIAL PRIMARY KEY,
      actor_type VARCHAR(20) NOT NULL,
      actor_id INTEGER NOT NULL,
      actor_name VARCHAR(255) NOT NULL,
      actor_email VARCHAR(255) NOT NULL,
      actor_role VARCHAR(120),
      event_type VARCHAR(40) NOT NULL,
      page_path VARCHAR(512) NOT NULL,
      feature_name VARCHAR(255),
      duration_seconds INTEGER,
      interaction_meta JSONB,
      ip_address VARCHAR(120) NOT NULL,
      user_agent TEXT NOT NULL,
      browser_name VARCHAR(80) NOT NULL,
      browser_version VARCHAR(80) NOT NULL,
      os_name VARCHAR(120) NOT NULL,
      device_type VARCHAR(40) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_activity_audit_logs_created_at
      ON activity_audit_logs (created_at DESC)
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_activity_audit_logs_actor
      ON activity_audit_logs (actor_type, actor_id, created_at DESC)
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_activity_audit_logs_event_type
      ON activity_audit_logs (event_type, created_at DESC)
  `
}

export async function insertAuditLog(
  sql: NeonQueryFunction<false, false>,
  log: AuditLogInsert,
) {
  await ensureAuditLogTable(sql)

  await sql`
    INSERT INTO activity_audit_logs (
      actor_type,
      actor_id,
      actor_name,
      actor_email,
      actor_role,
      event_type,
      page_path,
      feature_name,
      duration_seconds,
      interaction_meta,
      ip_address,
      user_agent,
      browser_name,
      browser_version,
      os_name,
      device_type
    ) VALUES (
      ${log.actorType},
      ${log.actorId},
      ${log.actorName},
      ${log.actorEmail},
      ${log.actorRole},
      ${log.eventType},
      ${log.pagePath},
      ${log.featureName ?? null},
      ${log.durationSeconds ?? null},
      ${log.interactionMeta ? JSON.stringify(log.interactionMeta) : null}::jsonb,
      ${log.ipAddress},
      ${log.userAgent},
      ${log.browserName},
      ${log.browserVersion},
      ${log.osName},
      ${log.deviceType}
    )
  `
}

export function getClientIp(requestHeaders: Headers) {
  const forwarded = requestHeaders.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown"
  }
  return (
    requestHeaders.get("x-real-ip") ||
    requestHeaders.get("cf-connecting-ip") ||
    requestHeaders.get("x-client-ip") ||
    "unknown"
  )
}

export function parseUserAgent(userAgent: string): BrowserInfo {
  const ua = userAgent || ""
  const lower = ua.toLowerCase()

  let browserName = "Unknown"
  let browserVersion = "Unknown"
  if (lower.includes("edg/")) {
    browserName = "Edge"
    browserVersion = extractVersion(ua, /edg\/([0-9.]+)/i)
  } else if (lower.includes("chrome/") && !lower.includes("edg/")) {
    browserName = "Chrome"
    browserVersion = extractVersion(ua, /chrome\/([0-9.]+)/i)
  } else if (lower.includes("firefox/")) {
    browserName = "Firefox"
    browserVersion = extractVersion(ua, /firefox\/([0-9.]+)/i)
  } else if (lower.includes("safari/") && lower.includes("version/")) {
    browserName = "Safari"
    browserVersion = extractVersion(ua, /version\/([0-9.]+)/i)
  }

  let osName = "Unknown"
  if (lower.includes("windows")) osName = "Windows"
  else if (lower.includes("mac os x")) osName = "macOS"
  else if (lower.includes("android")) osName = "Android"
  else if (lower.includes("iphone") || lower.includes("ipad") || lower.includes("ios")) osName = "iOS"
  else if (lower.includes("linux")) osName = "Linux"

  let deviceType: BrowserInfo["deviceType"] = "desktop"
  if (/bot|crawler|spider|crawling/i.test(ua)) deviceType = "bot"
  else if (/tablet|ipad/i.test(ua)) deviceType = "tablet"
  else if (/mobile|iphone|android/i.test(ua)) deviceType = "mobile"

  return { browserName, browserVersion, osName, deviceType }
}

function extractVersion(userAgent: string, regex: RegExp) {
  const match = userAgent.match(regex)
  return match?.[1] || "Unknown"
}

