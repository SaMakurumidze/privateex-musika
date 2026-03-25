"use client"

import { useState } from "react"
import { useTheme } from "next-themes"

type Props = {
  initialPhone: string
  initialAddress: string
}

export function DashboardSettingsForm({ initialPhone, initialAddress }: Props) {
  const [phone, setPhone] = useState(initialPhone)
  const [address, setAddress] = useState(initialAddress)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const { theme, setTheme } = useTheme()

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    try {
      const response = await fetch("/api/dashboard/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, address }),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Failed to save settings.")
        return
      }

      setSuccess("Profile updated successfully.")
    } catch {
      setError("Failed to save settings.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={saveProfile} className="space-y-4 rounded-2xl border border-border bg-card/50 p-6">
        <h2 className="text-xl font-semibold">Profile Information</h2>

        {error && <p className="rounded-md bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        {success && <p className="rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-300">{success}</p>}

        <div className="space-y-2">
          <label htmlFor="phone" className="text-sm font-medium">
            Phone Number
          </label>
          <input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+263..."
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="address" className="text-sm font-medium">
            Address
          </label>
          <textarea
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Your residential address"
            rows={3}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save Profile"}
        </button>
      </form>

      <div className="space-y-4 rounded-2xl border border-border bg-card/50 p-6">
        <h2 className="text-xl font-semibold">Theme</h2>
        <p className="text-sm text-muted-foreground">
          Choose your appearance preference. Default theme follows your system setting.
        </p>

        <div className="flex flex-wrap gap-2">
          {[
            { id: "system", label: "Default" },
            { id: "light", label: "Light" },
            { id: "dark", label: "Dark" },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setTheme(option.id)}
              className={`rounded-md border px-4 py-2 text-sm ${
                theme === option.id
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-background text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
