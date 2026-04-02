import { redirect } from "next/navigation"
import { getAdminSession, hasPermission } from "@/lib/admin-auth"
import { createSQLClient } from "@/lib/db"
import { ensureAuditLogTable } from "@/lib/audit-log"

type AuditLogRow = {
  id: number
  actor_type: string
  actor_name: string
  actor_email: string
  actor_role: string | null
  event_type: string
  page_path: string
  feature_name: string | null
  duration_seconds: number | null
  ip_address: string
  browser_name: string
  browser_version: string
  os_name: string
  device_type: string
  created_at: string
}

export const dynamic = "force-dynamic"

export default async function AdminAuditLogsPage() {
  const admin = await getAdminSession()
  if (!admin) redirect("/admin")
  if (!hasPermission(admin.role, "analytics:view")) redirect("/admin/dashboard")

  const sql = createSQLClient()
  await ensureAuditLogTable(sql)

  const logs = (await sql`
    SELECT
      id,
      actor_type,
      actor_name,
      actor_email,
      actor_role,
      event_type,
      page_path,
      feature_name,
      duration_seconds,
      ip_address,
      browser_name,
      browser_version,
      os_name,
      device_type,
      created_at
    FROM activity_audit_logs
    WHERE actor_type = 'investor'
      OR (actor_type = 'admin' AND LOWER(actor_email) <> 'superadmin@privateex.com')
    ORDER BY created_at DESC
    LIMIT 500
  `) as AuditLogRow[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Audit Logs</h1>
        <p className="mt-1 text-muted-foreground">
          Activity trail for investors and non-super-admin users.
        </p>
      </div>

      <div className="admin-panel overflow-x-auto p-4">
        <table className="w-full min-w-[1250px]">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">When</th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actor</th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Role</th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">IP Address</th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Browser</th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Device</th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Page</th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Time Spent</th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Feature Interaction</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-border/40 align-top">
                <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td className="px-3 py-3 text-sm">
                  <p className="font-medium text-foreground">{log.actor_name}</p>
                  <p className="text-xs text-muted-foreground">{log.actor_email}</p>
                </td>
                <td className="px-3 py-3 text-xs text-muted-foreground">
                  {log.actor_role || log.actor_type}
                </td>
                <td className="px-3 py-3 text-xs font-mono text-muted-foreground">{log.ip_address}</td>
                <td className="px-3 py-3 text-xs text-muted-foreground">
                  {log.browser_name} {log.browser_version}
                </td>
                <td className="px-3 py-3 text-xs text-muted-foreground">
                  {log.device_type} ({log.os_name})
                </td>
                <td className="px-3 py-3 text-xs text-muted-foreground break-all">{log.page_path}</td>
                <td className="px-3 py-3 text-xs text-muted-foreground">
                  {log.event_type === "page_time" && log.duration_seconds
                    ? `${log.duration_seconds}s`
                    : "-"}
                </td>
                <td className="px-3 py-3 text-xs text-muted-foreground">
                  {log.event_type === "feature_interaction" ? log.feature_name || "Unnamed action" : "-"}
                </td>
              </tr>
            ))}
            {logs.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No audit records yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}

