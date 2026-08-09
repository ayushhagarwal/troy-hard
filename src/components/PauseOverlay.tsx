import { BrandMark } from "./BrandMark"
import { GameButton } from "./GameButton"
import { PauseIcon } from "./GameIcons"

interface PauseOverlayProps {
  onResume(): void
  onRetry(): void
  onTitle(): void
}

export function PauseOverlay({ onResume, onRetry, onTitle }: PauseOverlayProps) {
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    panelRef.current?.querySelector<HTMLElement>("button")?.focus()
    return () => previousFocus?.focus()
  }, [])

  return (
    <div
      className="pause-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
      onKeyDown={(event) => {
        if (event.key !== "Tab" || !panelRef.current) return
        const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>("button, a[href], [tabindex]:not([tabindex='-1'])"))
          .filter((element) => !element.hasAttribute("disabled"))
        const first = focusable[0]
        const last = focusable.at(-1)
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }}
    >
      <section ref={panelRef} className="pause-panel">
        <PauseIcon className="pause-icon" />
        <BrandMark compact />
        <p className="section-label">SIEGE PAUSED</p>
        <h2 id="pause-title">The Trojans are pretending this is normal.</h2>
        <p>Release the horse, center the Greeks, and take a breath.</p>
        <div className="pause-actions">
          <GameButton variant="primary" onClick={onResume}>RESUME THE PULL</GameButton>
          <GameButton variant="quiet" onClick={onRetry}>RESTART THIS SIEGE</GameButton>
          <button className="back-link" onClick={onTitle}>Back to title</button>
        </div>
      </section>
    </div>
  )
}
import { useEffect, useRef } from "react"
