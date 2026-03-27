"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import { Loader2, Send } from "lucide-react"

type InvestorOption = {
  id: number
  full_name: string
  email: string
}

export function AdminMessagesPanel({ investors }: { investors: InvestorOption[] }) {
  const [recipientType, setRecipientType] = useState<"all" | "individual">("all")
  const [investorId, setInvestorId] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFeedback(null)

    if (!subject.trim() || !message.trim()) {
      setFeedback({ type: "error", text: "Subject and message are required." })
      return
    }

    if (recipientType === "individual" && !investorId) {
      setFeedback({ type: "error", text: "Please select an investor recipient." })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/admin/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientType,
          investorId: recipientType === "individual" ? Number.parseInt(investorId, 10) : undefined,
          subject: subject.trim(),
          message: message.trim(),
        }),
      })
      const data = (await response.json()) as { error?: string; sentTo?: number; scope?: string }

      if (!response.ok) {
        setFeedback({ type: "error", text: data.error || "Failed to send message." })
        return
      }

      setFeedback({
        type: "success",
        text:
          data.scope === "all"
            ? `Message sent to ${data.sentTo || 0} users.`
            : "Message sent to selected user.",
      })
      setSubject("")
      setMessage("")
      if (recipientType === "individual") {
        setInvestorId("")
      }
    } catch {
      setFeedback({ type: "error", text: "Network error while sending message." })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="admin-panel p-6">
      <h2 className="text-xl font-semibold text-foreground">Send Message</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Broadcast announcements to all investors or send a targeted message to an individual user.
      </p>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="recipientType">
              Recipient Scope
            </label>
            <select
              id="recipientType"
              value={recipientType}
              onChange={(e) => setRecipientType(e.target.value === "individual" ? "individual" : "all")}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All users</option>
              <option value="individual">Individual user</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="investorId">
              Investor
            </label>
            <select
              id="investorId"
              value={investorId}
              onChange={(e) => setInvestorId(e.target.value)}
              disabled={recipientType !== "individual"}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select investor</option>
              {investors.map((investor) => (
                <option key={investor.id} value={String(investor.id)}>
                  {investor.full_name} ({investor.email})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="subject">
            Subject
          </label>
          <input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={255}
            placeholder="Message subject"
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="messageBody">
            Message Body
          </label>
          <textarea
            id="messageBody"
            rows={8}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your message here..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {feedback && (
          <p
            className={`rounded-lg border px-3 py-2 text-sm ${
              feedback.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-red-500/30 bg-red-500/10 text-red-400"
            }`}
          >
            {feedback.text}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {submitting ? "Sending..." : "Send Message"}
        </button>
      </form>
    </section>
  )
}
