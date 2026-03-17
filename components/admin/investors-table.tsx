"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, Unlock, KeyRound, User } from "lucide-react"
import type { Permission } from "@/lib/admin-auth"

export interface Investor {
  id: number
  full_name: string
  email: string
  phone: string
  country: string
  id_passport: string
  is_locked: boolean
  wallet_balance: string | null
  created_at: Date
}

interface InvestorsTableProps {
  investors: Investor[]
  permissions: readonly Permission[]
}

export function InvestorsTable({ investors, permissions }: InvestorsTableProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const canResetPassword = permissions.includes("investors:reset_password")
  const canLock = permissions.includes("investors:lock")
  const canUnlock = permissions.includes("investors:unlock")

  const handleAction = async (investorId: number, action: string) => {
    setLoading(`${investorId}-${action}`)
    setError("")
    setSuccess("")

    try {
      const response = await fetch(`/api/admin/investors/${investorId}/${action}`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Action failed")
        return
      }

      if (action === "reset-password" && data.tempPassword) {
        setSuccess(`Password reset. Temporary password: ${data.tempPassword}`)
      } else {
        setSuccess(data.message || "Action completed")
      }

      router.refresh()
    } catch (err) {
      setError("An error occurred")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm font-mono">
          {success}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Investor</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Contact</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">ID/Passport</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Wallet</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {investors.map((investor) => (
              <tr key={investor.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{investor.full_name}</p>
                      <p className="text-xs text-muted-foreground">{investor.country}</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <p className="text-foreground">{investor.email}</p>
                  <p className="text-xs text-muted-foreground">{investor.phone}</p>
                </td>
                <td className="py-4 px-4 text-muted-foreground font-mono text-sm">
                  {investor.id_passport}
                </td>
                <td className="py-4 px-4 text-right font-medium text-primary">
                  ${investor.wallet_balance ? Number(investor.wallet_balance).toLocaleString("en-US", { minimumFractionDigits: 2 }) : "0.00"}
                </td>
                <td className="py-4 px-4 text-center">
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${
                    investor.is_locked
                      ? "bg-red-500/20 text-red-400 border-red-500/30"
                      : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  }`}>
                    {investor.is_locked ? "Locked" : "Active"}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center justify-end gap-2">
                    {canResetPassword && (
                      <button
                        onClick={() => handleAction(investor.id, "reset-password")}
                        disabled={loading === `${investor.id}-reset-password`}
                        className="p-2 text-amber-400 hover:bg-amber-500/20 rounded-lg transition-colors disabled:opacity-50"
                        title="Reset Password"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                    )}
                    {canLock && !investor.is_locked && (
                      <button
                        onClick={() => handleAction(investor.id, "lock")}
                        disabled={loading === `${investor.id}-lock`}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                        title="Lock Account"
                      >
                        <Lock className="h-4 w-4" />
                      </button>
                    )}
                    {canUnlock && investor.is_locked && (
                      <button
                        onClick={() => handleAction(investor.id, "unlock")}
                        disabled={loading === `${investor.id}-unlock`}
                        className="p-2 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors disabled:opacity-50"
                        title="Unlock Account"
                      >
                        <Unlock className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {investors.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  No investors found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
