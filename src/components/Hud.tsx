import type { SimulationSnapshot } from "../types"
import { BrandMark } from "./BrandMark"
import { SettingsIcon, SpearIcon } from "./GameIcons"

interface HudProps {
  snapshot: SimulationSnapshot
  learnedHeave: boolean
  learnedBalance: boolean
  learnedBrake: boolean
  onSettings(): void
}

export function Hud({ snapshot, learnedHeave, learnedBalance, learnedBrake, onSettings }: HudProps) {
  const litSpears = Math.min(3, Math.ceil(snapshot.suspicionPct / 34))
  const ropeCritical = snapshot.tension >= 0.82
  const instruction = snapshot.inspection.phase !== "idle" && !learnedBrake
    ? "RELEASE TO BRACE · CENTER THE GREEKS"
    : ropeCritical
      ? "ROPE STRAIN · RELEASE TO BRACE"
      : !learnedHeave
        ? "HOLD TO HEAVE"
        : !learnedBalance
          ? "SLIDE OR USE A / D TO BALANCE"
          : !learnedBrake
            ? "RELEASE TO BRAKE"
            : ""
  return (
    <div className="hud">
      <div className="hud-score">
        <BrandMark compact />
        <strong>{snapshot.score.toLocaleString()}</strong>
      </div>
      <div className="hud-gate">
        <span>GATE</span>
        <strong>{Math.ceil(snapshot.distanceM)} m</strong>
        <small>{snapshot.act === "pull" ? "THE PULL" : snapshot.act === "inspection" ? "THE INSPECTION" : "THE GATE"}</small>
      </div>
      <div className="hud-suspicion">
        <span>SUSPICION</span>
        <div className="spear-meter" aria-label={`${Math.round(snapshot.suspicionPct)} percent suspicion`}>
          {[0, 1, 2].map((index) => <SpearIcon key={index} className={index < litSpears ? "is-lit" : ""} />)}
        </div>
        <small>{Math.round(snapshot.suspicionPct)}%</small>
      </div>
      <div className={`inspection-callout inspection-callout--${snapshot.inspection.phase}`} role="status" aria-live="polite" aria-atomic="true">
        {snapshot.inspection.phase === "telegraph" ? "TORCH RAISED · SETTLE THE HORSE" : snapshot.inspection.phase === "active" ? "DO NOT LOOK SELF-PROPELLED" : ""}
      </div>
      <div className="condition-meter" aria-label={`Horse condition ${Math.round(snapshot.conditionPct)} percent`}>
        <span>HORSE</span><b style={{ transform: `scaleX(${snapshot.conditionPct / 100})` }} />
      </div>
      <div className={`rope-meter ${ropeCritical ? "is-critical" : ""}`} aria-label={`Rope tension ${Math.round(snapshot.tension * 100)} percent${ropeCritical ? ", critical, release to brace" : ""}`}>
        <span>{ropeCritical ? "ROPE · RELEASE" : "ROPE"}</span><strong>{Math.round(snapshot.tension * 100)}%</strong><b style={{ transform: `scaleX(${Math.min(1, snapshot.tension)})` }} />
      </div>
      {snapshot.act === "gate" ? (
        <div className={`gate-speed ${snapshot.velocity <= snapshot.gateSafeSpeed ? "is-safe" : "is-fast"}`}>
          <span>ENTRY SPEED</span>
          <strong>{snapshot.velocity.toFixed(2)} m/s</strong>
          <b><i style={{ transform: `scaleX(${Math.min(1, snapshot.velocity / 1.9)})` }} /></b>
          <small>SAFE BELOW {snapshot.gateSafeSpeed.toFixed(2)}</small>
        </div>
      ) : null}
      {instruction ? <p className={`hud-instruction ${ropeCritical ? "is-danger" : ""}`}>{instruction}</p> : null}
      <button className="hud-settings" onClick={onSettings} aria-label="Pause and open settings"><SettingsIcon /></button>
    </div>
  )
}
