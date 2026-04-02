"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"

type ActivityTrackerProps = {
  scope: "admin" | "investor"
}

export function ActivityTracker({ scope }: ActivityTrackerProps) {
  const pathname = usePathname()
  const pathStartRef = useRef<number>(0)
  const lastInteractionRef = useRef<number>(0)

  useEffect(() => {
    pathStartRef.current = Date.now()
    void track("page_view", { pagePath: pathname })
  }, [pathname])

  useEffect(() => {
    const sendPageTime = () => {
      const seconds = Math.floor((Date.now() - pathStartRef.current) / 1000)
      if (seconds <= 0) return
      void track("page_time", {
        pagePath: pathname,
        durationSeconds: seconds,
        interactionMeta: { scope },
      })
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        sendPageTime()
      }
    }

    const onBeforeUnload = () => {
      sendPageTime()
    }

    const onClick = (event: MouseEvent) => {
      const now = Date.now()
      if (now - lastInteractionRef.current < 800) return

      const target = event.target as HTMLElement | null
      const interactive = target?.closest(
        "[data-audit-feature],button,a,[role='button'],input[type='submit'],input[type='button']",
      ) as HTMLElement | null
      if (!interactive) return

      const featureName =
        interactive.getAttribute("data-audit-feature") ||
        interactive.getAttribute("aria-label") ||
        interactive.getAttribute("title") ||
        (interactive.textContent || "").trim()

      if (!featureName) return
      lastInteractionRef.current = now

      void track("feature_interaction", {
        pagePath: pathname,
        featureName: featureName.slice(0, 255),
        interactionMeta: {
          scope,
          tagName: interactive.tagName.toLowerCase(),
        },
      })
    }

    window.addEventListener("beforeunload", onBeforeUnload)
    document.addEventListener("visibilitychange", onVisibilityChange)
    document.addEventListener("click", onClick, true)
    return () => {
      sendPageTime()
      window.removeEventListener("beforeunload", onBeforeUnload)
      document.removeEventListener("visibilitychange", onVisibilityChange)
      document.removeEventListener("click", onClick, true)
    }
  }, [pathname, scope])

  return null
}

async function track(eventType: "page_view" | "page_time" | "feature_interaction", payload: Record<string, unknown>) {
  const body = JSON.stringify({ eventType, ...payload })
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" })
      navigator.sendBeacon("/api/audit/track", blob)
      return
    }
  } catch {
    // Ignore sendBeacon failures and fallback to fetch.
  }

  try {
    await fetch("/api/audit/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
      credentials: "include",
    })
  } catch {
    // Silent by design - audit logging must not block UX.
  }
}

