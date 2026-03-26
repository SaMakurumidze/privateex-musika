 "use client"

import type React from "react"
import Link from "next/link"
import { useState } from "react"
import { Building2, Briefcase, History, Shield, LogOut, Settings, HelpCircle, Mail, Menu, X } from "lucide-react"
import type { Investor } from "@/lib/auth"
import { InactivityLogout } from "@/components/inactivity-logout"

interface DashboardLayoutProps {
  children: React.ReactNode
  user: Investor
}

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div
      data-dashboard-shell="true"
      className="min-h-screen bg-gradient-to-br from-background via-card to-muted"
    >
      <InactivityLogout logoutEndpoint="/api/auth/logout" redirectTo="/" />

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
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              PrivateEx. Global
            </span>
            <span className="text-sm text-muted-foreground hidden md:inline">Pre-IPO Marketplace</span>
          </div>

          <div className="flex items-center gap-4">
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
                <MobileNavLink href="/dashboard/messages" icon={Mail} onNavigate={() => setMobileMenuOpen(false)}>
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
            <NavLink href="/dashboard/messages" icon={Mail}>
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
}

function NavLink({ href, icon: Icon, children }: NavLinkProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-all duration-200"
    >
      <Icon className="h-5 w-5" />
      <span className="font-medium">{children}</span>
    </Link>
  )
}

function MobileNavLink({
  href,
  icon: Icon,
  children,
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
    </Link>
  )
}
