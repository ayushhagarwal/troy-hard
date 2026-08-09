import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"
import { sanitizeTelemetryEvent } from "../game/analytics"

export function Telemetry() {
  const hostname = window.location.hostname
  const enabled = hostname.endsWith(".vercel.app")
  if (!enabled) return null
  return (
    <>
      <Analytics beforeSend={sanitizeTelemetryEvent} />
      <SpeedInsights beforeSend={sanitizeTelemetryEvent} />
    </>
  )
}
