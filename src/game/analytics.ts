import { track } from "@vercel/analytics"

type AnalyticsPayload = Record<string, string | number | boolean>

export function trackingAllowed() {
  if (typeof navigator === "undefined") return false
  const extended = navigator as Navigator & { globalPrivacyControl?: boolean }
  return navigator.doNotTrack !== "1" && !extended.globalPrivacyControl
}

export function sanitizeTelemetryEvent<T extends { url: string }>(event: T): T | null {
  if (!trackingAllowed()) return null
  try {
    const url = new URL(event.url, window.location.origin)
    const pathname = /^\/c\/[^/]+$/.test(url.pathname) ? "/c/[token]" : url.pathname
    return { ...event, url: `${url.origin}${pathname}` }
  } catch {
    return null
  }
}

export function trackGameEvent(name: string, payload: AnalyticsPayload = {}) {
  if (!trackingAllowed()) return
  try {
    track(name, payload)
  } catch {
    // Analytics is deliberately non-blocking and may be unavailable on Hobby plans.
  }
}

export function scoreBucket(score: number) {
  if (score < 5_000) return "failed"
  if (score < 6_000) return "5k"
  if (score < 7_500) return "6k"
  if (score < 9_000) return "7.5k"
  return "9k"
}
