"use client"

import { Suspense, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

function ResetPasswordContent() {
  const params = useSearchParams()
  const router = useRouter()
  const token = useMemo(() => params.get("token") || "", [params])

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setSuccess("")

    if (!token) {
      setError("Invalid reset link.")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to reset password.")
        setLoading(false)
        return
      }

      setSuccess(data.message || "Password reset successful.")
      setTimeout(() => router.push("/"), 1400)
    } catch {
      setError("Failed to reset password.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
        <form
          onSubmit={onSubmit}
          className="w-full rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur"
        >
          <h1 className="mb-2 text-2xl font-semibold">Reset Password</h1>
          <p className="mb-6 text-sm text-slate-300">Enter your new password below.</p>

          {error && (
            <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
              {success}
            </div>
          )}

          <label className="mb-2 block text-sm text-slate-200" htmlFor="password">
            New password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-4 w-full rounded-md border border-white/20 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            required
            minLength={6}
          />

          <label className="mb-2 block text-sm text-slate-200" htmlFor="confirmPassword">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mb-6 w-full rounded-md border border-white/20 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            required
            minLength={6}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-60"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-white">
          <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
            <div className="w-full rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300 backdrop-blur">
              Loading reset form...
            </div>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  )
}
