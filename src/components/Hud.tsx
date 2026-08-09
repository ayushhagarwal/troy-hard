import type { SimulationSnapshot } from "../types"
import { BrandMark } from "./BrandMark"
import { SettingsIcon, SpearIcon } from "./GameIcons"

interface HudProps {
  snapshot: SimulationSnapshot
  learnedBrace: boolean
  learnedBalance: boolean
  onSettings(): void
}

export function Hud({ snapshot, learnedBrace, learnedBalance, onSettings }: HudProps) {
  const litSpears = Math.min(3, Math.ceil(snapshot.suspicionPct / 34))
  const ropeCritical = snapshot.tension >= 0.82
  const braced = snapshot.braceLoad >= 0.68
  const tipping = Math.abs(snapshot.pitch) >= 8
  const counterDirection = snapshot.pitch > 0 ? "LEFT" : "RIGHT"
  const instruction = snapshot.inspection.phase === "active" && !braced
    ? "HOLD TO BRACE · THE GUARDS CAN HEAR THEM"
    : snapshot.inspection.phase === "active" && tipping
      ? `HORSE TIPPING · SHIFT ${counterDirection}`
      : snapshot.inspection.phase === "active"
        ? "HOLD STILL · INSPECTION CLEARING"
    : ropeCritical
      ? "ROPE STRAIN · CENTER THE HIDDEN CREW"
      : tipping
        ? `COUNTER THE SLOPE · SHIFT ${counterDirection}`
      : braced
        ? "BRACING SLOWS THE CART · RELEASE FOR SPEED"
      : !learnedBrace
        ? "HOLD SPACE OR PRESS TO BRACE"
        : !learnedBalance
          ? "SLIDE OR USE A / D TO COUNTERBALANCE"
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
        {snapshot.inspection.phase === "telegraph"
          ? "TORCH RAISED · THE TROJANS ARE STOPPING"
          : snapshot.inspection.phase === "active" && !braced
            ? "INSPECTION · BRACE THE HIDDEN CREW"
            : snapshot.inspection.phase === "active" && tipping
              ? "INSPECTION · LEVEL THE HORSE"
              : snapshot.inspection.phase === "active"
                ? "INSPECTION · DO NOT MOVE"
                : ""}
      </div>
      <div className="condition-meter" aria-label={`Horse condition ${Math.round(snapshot.conditionPct)} percent`}>
        <span>HORSE</span><b style={{ transform: `scaleX(${snapshot.conditionPct / 100})` }} />
      </div>
      <div className={`rope-meter ${ropeCritical ? "is-critical" : ""}`} aria-label={`Rope tension ${Math.round(snapshot.tension * 100)} percent${ropeCritical ? ", critical, center the hidden crew" : ""}`}>
        <span>{ropeCritical ? "ROPE · CENTER LOAD" : "ROPE"}</span><strong>{Math.round(snapshot.tension * 100)}%</strong><b style={{ transform: `scaleX(${Math.min(1, snapshot.tension)})` }} />
      </div>
      {snapshot.act === "gate" ? (
        <div className={`gate-speed ${snapshot.velocity <= snapshot.gateSafeSpeed ? "is-safe" : "is-fast"}`}>
          <span>ENTRY SPEED</span>
          <strong>{snapshot.velocity.toFixed(2)} m/s</strong>
          <b><i style={{ transform: `scaleX(${Math.min(1, snapshot.velocity / 1.9)})` }} /></b>
          <small>SAFE BELOW {snapshot.gateSafeSpeed.toFixed(2)}</small>
        </div>
      ) : null}
      {instruction ? <p className={`hud-instruction ${ropeCritical || tipping || snapshot.inspection.phase === "active" ? "is-danger" : ""}`}>{instruction}</p> : null}
      <div className={`control-guide ${braced ? "is-braced" : ""}`} aria-label={`The Trojans pull automatically. Hidden crew ${braced ? "braced and quiet; cart slowed" : "loose; cart at full pull"}. Noise ${Math.round(snapshot.noisePct)} percent.`}>
        <span>TROJANS PULL <i aria-hidden="true">→ UPHILL INTO THE GATE</i></span>
        <strong>{braced ? "BRACING · QUIET · CART SLOWED" : "HOLD SPACE / PRESS · BRACE"}</strong>
        <small>SLIDE OR A / D · SHIFT HIDDEN CREW <b>{Math.round(snapshot.noisePct)}% NOISE</b></small>
      </div>
      <button className="hud-settings" onClick={onSettings} aria-label="Pause and open settings"><SettingsIcon /></button>
    </div>
  )
}
