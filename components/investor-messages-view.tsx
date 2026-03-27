"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Send } from "lucide-react"

export type AnnouncementItem = {
  id: number
  subject: string
  body: string
  created_at: string
}

export type ConversationItem = {
  id: number
  sender_type: "investor" | "admin"
  subject: string | null
  body: string
  admin_name: string | null
  created_at: string
}

function isStrongEnoughMessage(text: string) {
  return text.trim().length >= 1
}

export function InvestorMessagesView({
  announcements,
  conversation,
}: {
  announcements: AnnouncementItem[]
  conversation: ConversationItem[]
}) {
  const router = useRouter()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [conversation.length])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    const trimmed = message.trim()
    if (!isStrongEnoughMessage(trimmed)) {
      setError("Please enter a message.")
      return
    }
    setSending(true)
    try {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim() || undefined,
          message: trimmed,
        }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(data.error || "Failed to send.")
        setSending(false)
        return
      }
      setSubject("")
      setMessage("")
      router.refresh()
    } catch {
      setError("Something went wrong. Try again.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">From PrivateEx</h2>
        <p className="text-sm text-muted-foreground">
          Announcements and notices from the platform appear here.
        </p>
        {announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No announcements yet.</p>
        ) : (
          <div className="space-y-4">
            {announcements.map((item) => (
              <article
                key={`a-${item.id}`}
                className="rounded-2xl border border-border bg-card/50 p-6"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">{item.subject}</h3>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                  {item.body.split(/\n\s*\n/).map((paragraph, index) => (
                    <p key={`${item.id}-p-${index}`}>{paragraph.trim()}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card/50 p-6">
        <h2 className="text-xl font-semibold text-foreground">Contact admins</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Send a message to the PrivateEx team. You will see replies here.
        </p>

        <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto rounded-xl border border-border bg-background/40 p-4">
          {conversation.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              No messages yet. Start the conversation below.
            </p>
          ) : (
            conversation.map((row) => {
              const mine = row.sender_type === "investor"
              return (
                <div
                  key={row.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                      mine
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card text-foreground"
                    }`}
                  >
                    {!mine && (
                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                        PrivateEx{row.admin_name ? ` · ${row.admin_name}` : ""}
                      </p>
                    )}
                    {mine && row.subject ? (
                      <p className="mb-1 text-xs font-medium opacity-90">{row.subject}</p>
                    ) : null}
                    <p className="whitespace-pre-wrap">{row.body}</p>
                    <p
                      className={`mt-2 text-[10px] ${
                        mine ? "text-primary-foreground/80" : "text-muted-foreground"
                      }`}
                    >
                      {new Date(row.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="mt-4 space-y-3">
          {error ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
              {error}
            </div>
          ) : null}
          <div className="space-y-2">
            <label htmlFor="user-msg-subject" className="text-sm font-medium text-foreground">
              Subject <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              id="user-msg-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={255}
              placeholder="e.g. Question about my wallet"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="user-msg-body" className="text-sm font-medium text-foreground">
              Message
            </label>
            <textarea
              id="user-msg-body"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Type your message to the team..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send to admins
          </button>
        </form>
      </section>
    </div>
  )
}
