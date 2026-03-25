import { cookies } from "next/headers"
import { createSQLClient, getDatabaseTargetInfo } from "./db"
import bcrypt from "bcryptjs"
import crypto from "crypto"

export type AdminRole = "admin" | "Associate" | "Junior Consultant" | "Senior Consultant"

export type Permission = 
  | "companies:view" | "companies:create" | "companies:edit" | "companies:search" 
  | "companies:approve" | "companies:authorize" | "companies:delist"
  | "directors:view" | "directors:create" | "directors:edit" | "directors:delete" | "directors:search"
  | "investors:view" | "investors:search" | "investors:reset_password" | "investors:lock" | "investors:unlock"
  | "wallets:view"
  | "analytics:view" | "analytics:export"

export interface AdminUser {
  id: number
  name: string
  email: string
  role: AdminRole
  created_at: Date
}

// Permission definitions per role - "admin" has same permissions as Senior Consultant
const PERMISSIONS: Record<AdminRole, readonly Permission[]> = {
  "admin": [
    "companies:view",
    "companies:create",
    "companies:edit",
    "companies:search",
    "companies:approve",
    "companies:authorize",
    "companies:delist",
    "directors:view",
    "directors:create",
    "directors:edit",
    "directors:delete",
    "directors:search",
    "investors:view",
    "investors:search",
    "investors:reset_password",
    "investors:lock",
    "investors:unlock",
    "wallets:view",
    "analytics:view",
    "analytics:export",
  ],
  "Associate": [
    "companies:view",
    "companies:create",
    "companies:edit",
    "companies:search",
    "directors:view",
    "directors:create",
    "directors:edit",
    "directors:search",
    "investors:view",
    "investors:search",
    "wallets:view",
    "analytics:view",
  ],
  "Junior Consultant": [
    "companies:view",
    "companies:create",
    "companies:edit",
    "companies:search",
    "companies:approve",
    "directors:view",
    "directors:create",
    "directors:edit",
    "directors:delete",
    "directors:search",
    "investors:view",
    "investors:search",
    "investors:reset_password",
    "wallets:view",
    "analytics:view",
  ],
  "Senior Consultant": [
    "companies:view",
    "companies:create",
    "companies:edit",
    "companies:search",
    "companies:approve",
    "companies:authorize",
    "companies:delist",
    "directors:view",
    "directors:create",
    "directors:edit",
    "directors:delete",
    "directors:search",
    "investors:view",
    "investors:search",
    "investors:reset_password",
    "investors:lock",
    "investors:unlock",
    "wallets:view",
    "analytics:view",
    "analytics:export",
  ],
}

// Normalize DB role values to supported AdminRole type
export function normalizeRole(dbRole: string): AdminRole {
  const role = dbRole?.trim()?.toLowerCase()
  
  // Map variations to standard roles
  if (role === "admin" || role === "super admin" || role === "superadmin" || role === "manager" || role === "senior manager") {
    return "admin"
  }
  if (role === "senior consultant" || role === "sr consultant" || role === "senior") {
    return "Senior Consultant"
  }
  if (role === "junior consultant" || role === "jr consultant" || role === "junior") {
    return "Junior Consultant"
  }
  if (role === "associate" || role === "assoc") {
    return "Associate"
  }
  
  // Default to Associate (lowest privilege) for unknown roles
  return "Associate"
}

export function hasPermission(role: AdminRole, permission: Permission): boolean {
  const normalizedRole = normalizeRole(role)
  return PERMISSIONS[normalizedRole]?.includes(permission) ?? false
}

export function getPermissions(role: AdminRole): readonly Permission[] {
  return PERMISSIONS[role] ?? []
}

export async function getAdminSession(): Promise<AdminUser | null> {
  const cookieStore = await cookies()
  const adminSessionId = cookieStore.get("admin_session")?.value

  if (!adminSessionId) {
    return null
  }

  try {
    const sql = createSQLClient()
    const users = await sql`
      SELECT id, name, email, role, created_at 
      FROM users 
      WHERE id = ${adminSessionId}
    `

    if (users.length === 0) {
      return null
    }

    const user = users[0] as AdminUser
    const normalizedRole = normalizeRole(user.role)
    
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: normalizedRole,
      created_at: user.created_at,
    }
  } catch (error) {
    console.error("Admin session error:", error)
    return null
  }
}

export async function verifyAdminCredentials(email: string, password: string): Promise<AdminUser | null> {
  try {
    const sql = createSQLClient()
    const users = await sql`
      SELECT * FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(${email}))
    `

    if (users.length === 0) {
      return null
    }

    const user = users[0]
    const storedPassword = String(user.password || "")
    const normalizedHash = storedPassword.replace(/^\$2y\$/, "$2a$")
    let passwordMatch = false
    let shouldRehash = false

    if (/^\$2[aby]\$/.test(normalizedHash)) {
      passwordMatch = await bcrypt.compare(password, normalizedHash)
    } else if (storedPassword === password) {
      passwordMatch = true
      shouldRehash = true
    } else if (/^[a-f0-9]{32}$/i.test(storedPassword)) {
      const md5 = crypto.createHash("md5").update(password).digest("hex")
      if (md5.toLowerCase() === storedPassword.toLowerCase()) {
        passwordMatch = true
        shouldRehash = true
      }
    }

    if (!passwordMatch) {
      return null
    }

    if (shouldRehash) {
      const upgradedHash = await bcrypt.hash(password, 10)
      await sql`
        UPDATE users
        SET password = ${upgradedHash}
        WHERE id = ${user.id}
      `
    }

    const normalizedRole = normalizeRole(user.role)
    
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: normalizedRole,
      created_at: user.created_at,
    }
  } catch (error) {
    console.error("Admin verify credentials DB/auth error:", {
      error,
      dbTarget: getDatabaseTargetInfo(),
    })
    throw new Error("AUTH_DB_ERROR")
  }
}

export async function createAdminSession(userId: number, role: AdminRole): Promise<void> {
  const cookieStore = await cookies()
  
  cookieStore.set("admin_session", userId.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8, // 8 hours
    path: "/",
  })
  
  cookieStore.set("admin_role", role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/",
  })
}

export async function destroyAdminSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete("admin_session")
  cookieStore.delete("admin_role")
}

// Server-side permission check that throws if unauthorized
export async function requirePermission(permission: Permission): Promise<AdminUser> {
  const admin = await getAdminSession()
  
  if (!admin) {
    throw new Error("Unauthorized: No admin session")
  }
  
  if (!hasPermission(admin.role, permission)) {
    throw new Error(`Forbidden: Missing permission ${permission}`)
  }
  
  return admin
}
