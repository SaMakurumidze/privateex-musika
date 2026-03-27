"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"

const STORAGE_KEY = "privateex:adminTheme"

/** Resolves saved admin preference (defaults to dark to match prior forced admin appearance). */
export function AdminThemeSync() {
  const { setTheme } = useTheme()

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null
    if (saved === "light" || saved === "dark") {
      setTheme(saved)
    } else {
      setTheme("dark")
    }
  }, [setTheme])

  return null
}

export function setAdminThemePreference(mode: "light" | "dark", setTheme: (t: string) => void) {
  window.localStorage.setItem(STORAGE_KEY, mode)
  setTheme(mode)
}
