"use client"

import { useEffect, useRef } from "react"

type InactivityLogoutProps = {
  timeoutMs?: number
  logoutEndpoint: string
  redirectTo: string
}

export function InactivityLogout({
  timeoutMs = 3 * 60 * 1000,
  logoutEndpoint,
  redirectTo,
}: InactivityLogoutProps) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasLoggedOutRef = useRef(false)

  useEffect(() => {
    const performLogout = async () => {
      if (hasLoggedOutRef.current) return
      hasLoggedOutRef.current = true

      try {
        await fetch(logoutEndpoint, {
          method: "POST",
          credentials: "include",
        })
      } catch {
        // Redirect regardless of API result to prevent stale sessions in UI.
      } finally {
        window.location.href = redirectTo
      }
    }

    const resetTimer = () => {
      if (hasLoggedOutRef.current) return
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(performLogout, timeoutMs)
    }

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "keydown",
      "click",
      "scroll",
      "touchstart",
    ]

    events.forEach((eventName) => window.addEventListener(eventName, resetTimer, { passive: true }))
    resetTimer()

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      events.forEach((eventName) =>
        window.removeEventListener(eventName, resetTimer as EventListener),
      )
    }
  }, [logoutEndpoint, redirectTo, timeoutMs])

  return null
}
