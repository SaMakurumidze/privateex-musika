"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import {
  Shield,
  Building2,
  Users,
  UserCog,
  Wallet,
  BarChart3,
  History,
  FileText,
  Mail,
  LogOut,
  ChevronRight,
  Moon,
  Sun,
} from "lucide-react"
import type { AdminRole, Permission } from "@/lib/admin-auth"
import { setAdminThemePreference } from "@/components/admin/admin-theme-sync"

interface AdminSidebarProps {
  admin: {
    name: string
    role: AdminRole
    email: string
  }
  permissions: readonly Permission[]
}

const navItems = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: BarChart3,
    permission: "analytics:view" as Permission,
  },
  {
    label: "Analytics",
    href: "/admin/dashboard/analytics",
    icon: BarChart3,
    permission: "analytics:view" as Permission,
  },
  {
    label: "Companies",
    href: "/admin/dashboard/companies",
    icon: Building2,
    permission: "companies:view" as Permission,
  },
  {
    label: "Directors",
    href: "/admin/dashboard/directors",
    icon: UserCog,
    permission: "directors:view" as Permission,
  },
  {
    label: "Investors",
    href: "/admin/dashboard/investors",
    icon: Users,
    permission: "investors:view" as Permission,
  },
  {
    label: "Wallets",
    href: "/admin/dashboard/wallets",
    icon: Wallet,
    permission: "wallets:view" as Permission,
  },
  {
    label: "Transactions",
    href: "/admin/dashboard/transactions",
    icon: History,
    permission: "analytics:view" as Permission,
  },
  {
    label: "Messages",
    href: "/admin/dashboard/messages",
    icon: Mail,
    permission: "investors:view" as Permission,
  },
  {
    label: "Accounting",
    href: "/admin/dashboard/accounting",
    icon: FileText,
    permission: "analytics:view" as Permission,
  },
]

export function AdminSidebar({ admin, permissions }: AdminSidebarProps) {
  const pathname = usePathname()
  const { setTheme, resolvedTheme } = useTheme()
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  const getRoleBadgeColor = (role: AdminRole) => {
    switch (role) {
      case "admin":
      case "Senior Consultant":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30"
      case "Junior Consultant":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "Associate":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  return (
    <aside className="admin-sidebar fixed left-0 top-0 flex h-screen w-64 flex-col bg-card/50 backdrop-blur-xl">
      <div className="admin-sidebar-header shrink-0 border-b border-border p-6">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm dark:bg-transparent dark:from-transparent dark:to-transparent dark:shadow-none">
            <Shield className="h-5 w-5 text-white dark:h-6 dark:w-6 dark:text-primary" />
          </div>
          <div>
            <h1 className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-lg font-bold text-transparent dark:from-primary dark:to-secondary">
              PrivateEx
            </h1>
            <p className="text-xs text-muted-foreground">Admin Console</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 min-h-0 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const hasAccess = permissions.includes(item.permission)
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          
          if (!hasAccess) return null

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
              {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
            </Link>
          )
        })}
      </nav>

      <div className="admin-sidebar-footer mt-auto shrink-0 border-t border-border p-4 pb-6">
        {mounted ? (
          <div className="mb-3 flex gap-2">
            <button
              type="button"
              onClick={() => setAdminThemePreference("light", setTheme)}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                resolvedTheme === "light"
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted/50"
              }`}
              aria-label="Light theme"
            >
              <Sun className="h-4 w-4" />
              Light
            </button>
            <button
              type="button"
              onClick={() => setAdminThemePreference("dark", setTheme)}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                resolvedTheme === "dark"
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted/50"
              }`}
              aria-label="Dark theme"
            >
              <Moon className="h-4 w-4" />
              Dark
            </button>
          </div>
        ) : null}
        <div className="mb-3 rounded-xl bg-background/50 p-3">
          <p className="font-medium text-foreground text-sm truncate">{admin.name}</p>
          <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
          <span className={`inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded-full border ${getRoleBadgeColor(admin.role)}`}>
            {admin.role}
          </span>
        </div>
        
        <form action="/api/admin/auth/logout" method="POST">
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium bg-red-500/10 text-red-400 hover:text-red-300 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </form>
      </div>
    </aside>
  )
}
