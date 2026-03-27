"use client"

import type { FormEvent } from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Send } from "lucide-react"

export function AdminThreadReply({ investorId }: { investorId: number }) {
  const router = useRouter()
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    const trimmed = message.trim()
    if (!trimmed) {
      setError("Please enter a reply.")
      return
    }
    setSubmitting(true)
    try {
      const response = await fetch("/api/admin/messages/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ investorId, message: trimmed }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(data.error || "Failed to send reply.")
        setSubmitting(false)
        return
      }
      setMessage("")
      router.refresh()
    } catch {
      setError("Network error.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="admin-panel space-y-3 p-4">
      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
      ) : null}
      <label htmlFor="admin-reply" className="text-sm font-medium text-foreground">
        Reply
      </label>
      <textarea
        id="admin-reply"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
        placeholder="Write your reply to this investor..."
      />
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Send reply
      </button>
    </form>
  )
}
