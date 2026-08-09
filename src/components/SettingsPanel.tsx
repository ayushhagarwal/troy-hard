import { useEffect, useRef } from "react"
import type { AccessibilitySettings } from "../types"
import { GameButton } from "./GameButton"

interface SettingsPanelProps {
  settings: AccessibilitySettings
  onChange(settings: AccessibilitySettings): void
  onClearData(): void
  onClose(): void
}

const SETTING_LABELS: Array<{ key: keyof AccessibilitySettings; title: string; description: string }> = [
  { key: "muted", title: "Mute all sound", description: "The inspections remain visible." },
  { key: "reducedMotion", title: "Reduced motion", description: "Removes shake, tilt, and large pottery wipes." },
  { key: "highContrast", title: "High contrast", description: "Strengthens HUD and inspection boundaries." },
  { key: "steadyHorse", title: "Steady Horse assist", description: "Adds rollover tolerance without blocking sharing." },
]

export function SettingsPanel({ settings, onChange, onClearData, onClose }: SettingsPanelProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    return () => previousFocus?.focus()
  }, [])

  return (
    <div
      className="settings-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault()
          event.stopPropagation()
          onClose()
        }
        if (event.key === "Tab") {
          const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button, input, a[href], [tabindex]:not([tabindex='-1'])"))
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
        }
      }}
    >
      <section className="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header>
          <div>
            <p className="section-label">GAME SETTINGS</p>
            <h2 id="settings-title">Make the horse behave.</h2>
          </div>
          <button ref={closeRef} className="icon-button" onClick={onClose} aria-label="Close settings">×</button>
        </header>
        <div className="settings-list">
          {SETTING_LABELS.map((item) => (
            <label key={item.key} className="setting-row">
              <span><strong>{item.title}</strong><small>{item.description}</small></span>
              <input
                type="checkbox"
                checked={settings[item.key]}
                onChange={(event) => onChange({ ...settings, [item.key]: event.currentTarget.checked })}
              />
            </label>
          ))}
        </div>
        <div className="settings-actions">
          <GameButton variant="quiet" onClick={onClearData}>Clear local data</GameButton>
          <GameButton variant="primary" onClick={onClose}>Done</GameButton>
        </div>
      </section>
    </div>
  )
}
