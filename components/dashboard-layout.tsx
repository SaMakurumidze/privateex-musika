import type React from "react"
import Link from "next/link"
import { Building2, Briefcase, History, Shield, LogOut, Settings, HelpCircle, Mail } from "lucide-react"
import type { Investor } from "@/lib/auth"

interface DashboardLayoutProps {
  children: React.ReactNode
  user: Investor
}

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-muted">
      {/* Topbar */}
      <header className="fixed top-0 left-0 right-0 h-20 bg-background/80 backdrop-blur-xl border-b border-border z-50">
        <div className="h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
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

      {/* Sidebar */}
      <aside className="fixed top-20 left-0 w-72 h-[calc(100vh-5rem)] bg-card/50 backdrop-blur-xl border-r border-border z-40 overflow-y-auto">
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
      <main className="ml-72 mt-20 p-8">{children}</main>
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
