 "use client"

import type React from "react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Building2, Briefcase, History, Shield, LogOut, Settings, HelpCircle, Mail, Menu, X } from "lucide-react"
import type { Investor } from "@/lib/auth"
import { InactivityLogout } from "@/components/inactivity-logout"
import { ActivityTracker } from "@/components/activity-tracker"
import { useTheme } from "next-themes"
import { usePathname } from "next/navigation"

interface DashboardLayoutProps {
  children: React.ReactNode
  user: Investor
}

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const { setTheme } = useTheme()
  const pathname = usePathname()

  useEffect(() => {
    const key = `privateex:theme:${user.id}`
    const savedPreference = localStorage.getItem(key)
    const resolvedTheme = savedPreference === "light" || savedPreference === "dark" ? savedPreference : "dark"
    setTheme(resolvedTheme)
  }, [setTheme, user.id])

  const displayedUnread = pathname === "/dashboard/messages" ? 0 : unreadMessages

  useEffect(() => {
    let active = true
    const loadUnreadCount = async () => {
      try {
        const response = await fetch("/api/messages/unread-count", { cache: "no-store" })
        if (!response.ok) return
        const data = (await response.json()) as { unreadCount?: number }
        if (active) {
          setUnreadMessages(Number(data.unreadCount || 0))
        }
      } catch {
        // Keep UI quiet if polling fails intermittently.
      }
    }

    loadUnreadCount()
    const timer = setInterval(loadUnreadCount, 30000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  return (
    <div
      data-dashboard-shell="true"
      className="min-h-screen bg-gradient-to-br from-background via-indigo-50/50 to-purple-50/60 dark:from-background dark:via-card dark:to-muted"
    >
      <InactivityLogout logoutEndpoint="/api/auth/logout" redirectTo="/" />
      <ActivityTracker scope="investor" />

      {/* Topbar */}
      <header className="fixed top-0 left-0 right-0 h-20 bg-background/80 backdrop-blur-xl border-b border-border z-50">
        <div className="h-full px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-3 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Go to dashboard"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm dark:bg-transparent dark:from-transparent dark:to-transparent dark:shadow-none">
                <Shield className="h-5 w-5 text-white dark:h-8 dark:w-8 dark:text-primary" />
              </span>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent dark:from-primary dark:to-secondary">
                PrivateEx. Global
              </span>
            </Link>
            <span className="text-sm text-muted-foreground hidden md:inline">Pre-IPO Marketplace</span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/messages"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/50 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Open messages"
              title="Open messages"
            >
              <Mail className="h-5 w-5" />
              {displayedUnread > 0 ? (
                <>
                  <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                  <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground">
                    {displayedUnread > 99 ? "99+" : displayedUnread}
                  </span>
                </>
              ) : null}
            </Link>
            <span className="text-sm text-muted-foreground hidden md:block">Welcome, {user.full_name}!</span>
            <div className="h-10 w-10 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-semibold">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Slide-over Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
          />
          <aside className="absolute left-0 top-0 h-full w-72 border-r border-border bg-card/95 backdrop-blur-xl">
            <div className="flex h-20 items-center justify-between border-b border-border px-4">
              <span className="font-semibold text-foreground">Navigation</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex h-[calc(100%-5rem)] flex-col">
              <div className="flex-1 space-y-2 p-4">
                <MobileNavLink href="/dashboard" icon={Building2} onNavigate={() => setMobileMenuOpen(false)}>
                  Companies
                </MobileNavLink>
                <MobileNavLink href="/dashboard/portfolio" icon={Briefcase} onNavigate={() => setMobileMenuOpen(false)}>
                  My Portfolio
                </MobileNavLink>
                <MobileNavLink href="/dashboard/transactions" icon={History} onNavigate={() => setMobileMenuOpen(false)}>
                  Transactions
                </MobileNavLink>
                <MobileNavLink
                  href="/dashboard/messages"
                  icon={Mail}
                  badgeCount={displayedUnread}
                  onNavigate={() => setMobileMenuOpen(false)}
                >
                  Messages
                </MobileNavLink>
                <MobileNavLink href="/dashboard/help" icon={HelpCircle} onNavigate={() => setMobileMenuOpen(false)}>
                  Help
                </MobileNavLink>
                <MobileNavLink href="/dashboard/settings" icon={Settings} onNavigate={() => setMobileMenuOpen(false)}>
                  Settings
                </MobileNavLink>
              </div>
              <div className="border-t border-border p-4">
                <form action="/api/auth/logout" method="POST">
                  <button
                    type="submit"
                    className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-muted-foreground transition-all duration-200 hover:bg-primary/5 hover:text-foreground"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="font-medium">Logout</span>
                  </button>
                </form>
              </div>
            </nav>
          </aside>
        </div>
      )}

      {/* Sidebar */}
      <aside className="fixed top-20 left-0 hidden h-[calc(100vh-5rem)] w-72 overflow-y-auto border-r border-border bg-card/50 backdrop-blur-xl z-40 lg:block">
        <nav className="flex flex-col h-full">
          <div className="flex-1 p-4 space-y-2">
            <NavLink href="/dashboard" icon={Building2}>
              Companies
            </NavLink>
            <NavLink href="/dashboard/portfolio" icon={Briefcase}>
              My Portfolio
            </NavLink>
            <NavLink href="/dashboard/transactions" icon={History}>
              Transactions
            </NavLink>
            <NavLink href="/dashboard/messages" icon={Mail} badgeCount={displayedUnread}>
              Messages
            </NavLink>
          </div>

          <div className="p-4 border-t border-border space-y-2">
            <NavLink href="/dashboard/help" icon={HelpCircle}>
              Help
            </NavLink>
            <NavLink href="/dashboard/settings" icon={Settings}>
              Settings
            </NavLink>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-all duration-200"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Logout</span>
              </button>
            </form>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="mt-20 p-4 sm:p-6 lg:ml-72 lg:p-8">{children}</main>
    </div>
  )
}

interface NavLinkProps {
  href: string
  icon: React.ElementType
  children: React.ReactNode
  badgeCount?: number
}

function NavLink({ href, icon: Icon, children, badgeCount = 0 }: NavLinkProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg px-4 py-3 text-muted-foreground transition-all duration-200 hover:bg-primary/5 hover:text-foreground"
    >
      <Icon className="h-5 w-5" />
      <span className="font-medium">{children}</span>
      {badgeCount > 0 ? (
        <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      ) : null}
    </Link>
  )
}

function MobileNavLink({
  href,
  icon: Icon,
  children,
  badgeCount = 0,
  onNavigate,
}: NavLinkProps & { onNavigate?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-lg px-4 py-3 text-muted-foreground transition-all duration-200 hover:bg-primary/5 hover:text-foreground"
    >
      <Icon className="h-5 w-5" />
      <span className="font-medium">{children}</span>
      {badgeCount > 0 ? (
        <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      ) : null}
    </Link>
  )
}
