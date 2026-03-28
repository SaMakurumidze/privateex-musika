"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"

type Props = {
  userId: number
  initialPhone: string
  initialAddress: string
  initialProfilePictureUrl: string
}

export function DashboardSettingsForm({
  userId,
  initialPhone,
  initialAddress,
  initialProfilePictureUrl,
}: Props) {
  const [phone, setPhone] = useState(initialPhone)
  const [address, setAddress] = useState(initialAddress)
  const [profilePictureUrl, setProfilePictureUrl] = useState(initialProfilePictureUrl)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [themePreference, setThemePreference] = useState<"default" | "light" | "dark">("default")
  const { setTheme } = useTheme()

  useEffect(() => {
    const key = `privateex:theme:${userId}`
    const savedPreference = localStorage.getItem(key)

    if (savedPreference === "light" || savedPreference === "dark") {
      setThemePreference(savedPreference)
      setTheme(savedPreference)
      return
    }

    setThemePreference("default")
    setTheme("dark")
  }, [setTheme, userId])

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    try {
      const response = await fetch("/api/dashboard/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, address, profilePictureUrl }),
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

  const handleProfilePictureChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      setError("Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File too large. Maximum size is 5MB.")
      return
    }

    setError("")
    setSuccess("")
    setIsUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
      const data = await response.json()
      if (!response.ok || !data?.url) {
        setError(data?.error || "Failed to upload profile picture.")
        return
      }
      setProfilePictureUrl(data.url)
      setSuccess("Profile picture uploaded. Click Save Profile to persist changes.")
    } catch {
      setError("Failed to upload profile picture.")
    } finally {
      setIsUploadingImage(false)
      event.target.value = ""
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={saveProfile} className="space-y-4 rounded-2xl border border-border bg-card/50 p-6">
        <h2 className="text-xl font-semibold">Profile Information</h2>

        {error && <p className="rounded-md bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        {success && <p className="rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-300">{success}</p>}

        <div className="space-y-2">
          <label className="text-sm font-medium">Profile Picture</label>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border bg-background">
              {profilePictureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- arbitrary uploaded / blob URLs
                <img src={profilePictureUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-muted-foreground">No photo</span>
              )}
            </div>
            <div className="space-y-1">
              <input
                id="settings-profile-picture"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleProfilePictureChange}
                className="hidden"
              />
              <label
                htmlFor="settings-profile-picture"
                className="inline-flex cursor-pointer rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {isUploadingImage ? "Uploading..." : "Upload Photo"}
              </label>
              <p className="text-xs text-muted-foreground">JPEG, PNG, GIF or WebP (max 5MB)</p>
            </div>
          </div>
        </div>

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
          disabled={loading || isUploadingImage}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save Profile"}
        </button>
      </form>

      <div className="space-y-4 rounded-2xl border border-border bg-card/50 p-6">
        <h2 className="text-xl font-semibold">Theme</h2>
        <p className="text-sm text-muted-foreground">
          Choose your appearance preference. Default theme is dark for this platform.
        </p>

        <div className="flex flex-wrap gap-2">
          {[
            { id: "default", label: "Default" },
            { id: "light", label: "Light" },
            { id: "dark", label: "Dark" },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                const key = `privateex:theme:${userId}`
                if (option.id === "default") {
                  localStorage.removeItem(key)
                  setTheme("dark")
                  setThemePreference("default")
                  return
                }

                localStorage.setItem(key, option.id)
                setTheme(option.id)
                setThemePreference(option.id as "light" | "dark")
              }}
              className={`rounded-md border px-4 py-2 text-sm ${
                themePreference === option.id
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
