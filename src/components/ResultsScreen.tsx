import { useEffect, useMemo, useRef, useState } from "react"
import type { RunConfig, RunResult } from "../types"
import { buildChallengeURL, buildShareIntent, shareCaption } from "../game/challenge"
import { downloadCard, renderResultCard, shareNative } from "../game/resultCard"
import { trackGameEvent } from "../game/analytics"
import { BrandMark } from "./BrandMark"
import { GameButton } from "./GameButton"

interface ResultsScreenProps {
  result: RunResult
  priorBest?: RunResult
  onRetry(): void
  onTitle(): void
}

const FAILURE_COPY: Record<Exclude<RunResult["outcome"], "success">, { title: string; cause: string }> = {
  spotted: { title: "THE HORSE CLEARED ITS THROAT.", cause: "A guard heard the wood whisper ‘neigh’." },
  rollover: { title: "A VERY NORMAL HORSE FELL OVER.", cause: "The Greeks leaned left. All of them." },
  rope_break: { title: "THE GIFT WAS LOAD-BEARING.", cause: "Four Trojans discovered tensile strength." },
  gate_crash: { title: "MOST OF IT MADE IT.", cause: "Troy requested a slower delivery window." },
  timeout: { title: "TROY CLOSED FOR THE EVENING.", cause: "The gate had excellent work-life balance." },
}

const FAILURE_ART: Record<Exclude<RunResult["outcome"], "success">, string> = {
  spotted: "/assets/art/failure-spotted.webp",
  rollover: "/assets/art/failure-freeze.webp",
  rope_break: "/assets/art/failure-freeze.webp",
  gate_crash: "/assets/art/failure-gate-crash.webp",
  timeout: "/assets/art/failure-timeout.webp",
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }
  const textarea = document.createElement("textarea")
  textarea.value = value
  textarea.style.position = "fixed"
  textarea.style.opacity = "0"
  document.body.append(textarea)
  textarea.select()
  const copied = document.execCommand("copy")
  textarea.remove()
  if (!copied) throw new Error("Clipboard is unavailable")
}

export function ResultsScreen({ result, priorBest, onRetry, onTitle }: ResultsScreenProps) {
  const [card, setCard] = useState<Blob | null>(null)
  const [notice, setNotice] = useState("")
  const headingRef = useRef<HTMLHeadingElement>(null)
  const success = result.outcome === "success"
  const failureCopy = result.outcome === "success" ? null : FAILURE_COPY[result.outcome]
  const delta = priorBest ? result.elapsedMs - priorBest.elapsedMs : null
  const duelDelta = result.config.targetScore === undefined ? null : result.score - result.config.targetScore
  const duelStatus = duelDelta === null
    ? null
    : duelDelta > 0
      ? `WON +${duelDelta}`
      : duelDelta < 0
        ? `SHORT ${Math.abs(duelDelta)}`
        : result.config.targetElapsedMs !== undefined && result.elapsedMs < result.config.targetElapsedMs
          ? "WON ON TIME"
          : result.config.targetElapsedMs !== undefined && result.elapsedMs > result.config.targetElapsedMs
            ? "LOST ON TIME"
            : result.config.targetSuspicionPct !== undefined && result.suspicionPct < result.config.targetSuspicionPct
              ? "WON ON STEALTH"
              : result.config.targetSuspicionPct !== undefined && result.suspicionPct > result.config.targetSuspicionPct
                ? "LOST ON STEALTH"
                : "EXACT TIE"
  const origin = typeof window === "undefined" ? "https://troy-hard-ayushhagarwals-projects.vercel.app" : window.location.origin
  const challengeUrl = useMemo(() => buildChallengeURL(result, origin), [origin, result])

  useEffect(() => {
    let cancelled = false
    void renderResultCard(result)
      .then((blob) => { if (!cancelled) setCard(blob) })
      .catch(() => { if (!cancelled) setNotice("The score card could not be drawn, but link sharing still works.") })
    return () => { cancelled = true }
  }, [result])

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  async function challengeFriend() {
    try {
      if (await shareNative(result, card)) {
        trackGameEvent("share_handoff", { channel: "native", asset: card ? "image" : "link" })
        return
      }
    } catch (error) {
      if ((error as DOMException).name === "AbortError") return
    }
    try {
      await copyText(`${shareCaption(result)} ${challengeUrl}`)
      setNotice("Challenge copied. The horse is now someone else’s problem.")
      trackGameEvent("share_handoff", { channel: "copy", asset: "link" })
    } catch {
      setNotice("Copy was blocked. Use Share on X or download the card below.")
    }
  }

  function shareOnX() {
    trackGameEvent("share_handoff", { channel: "x", asset: "link" })
    window.open(buildShareIntent(result, origin), "_blank", "noopener,noreferrer")
  }

  return (
    <main className={`results-screen ${success ? "results-screen--success" : "results-screen--failure"}`}>
      <img
        className="results-background"
        src={success ? "/assets/art/success-freeze.webp" : FAILURE_ART[result.outcome as Exclude<RunResult["outcome"], "success">]}
        alt=""
      />
      <section className="results-content">
        <BrandMark compact />
        <h1 ref={headingRef} tabIndex={-1}>{success ? "TROY INFILTRATED" : failureCopy?.title}</h1>
        <p className="result-cause">{success ? "The gate closed. Nobody checked the receipt." : failureCopy?.cause}</p>
        <div className="result-primary">
          <div><span>{success ? "TIME" : "GATE"}</span><strong>{success ? `${(result.elapsedMs / 1_000).toFixed(1)} s` : `${(100 - result.progressM).toFixed(0)} m`}</strong></div>
          <div><span>SCORE</span><strong>{result.score.toLocaleString()}</strong></div>
        </div>
        <p className="result-rank"><span>RANK</span>{result.rank}</p>
        <dl className="result-stats">
          <div><dt>SUSPICION</dt><dd>{result.suspicionPct}%</dd></div>
          <div><dt>HORSE CONDITION</dt><dd>{result.conditionPct}%</dd></div>
          <div><dt>PERSONAL BEST</dt><dd>{delta === null ? "FIRST RUN" : `${delta <= 0 ? "−" : "+"}${Math.abs(delta / 1_000).toFixed(1)} s`}</dd></div>
          {duelStatus ? <div><dt>DUEL</dt><dd>{duelStatus}</dd></div> : null}
        </dl>
        <div className="result-actions">
          <GameButton variant="primary" onClick={onRetry}>{success ? "RETRY THIS SIEGE" : "TRY AGAIN"}</GameButton>
          <div>
            <GameButton onClick={() => void challengeFriend()}>{success ? "CHALLENGE A FRIEND" : "SHARE THE DISASTER"}</GameButton>
            <GameButton onClick={shareOnX}>SHARE ON X</GameButton>
          </div>
          {card ? <button className="download-link" onClick={() => { downloadCard(card); trackGameEvent("share_handoff", { channel: "download", asset: "image" }) }}>Download score card</button> : null}
          <button className="back-link" onClick={onTitle}>Back to title</button>
          <p className="result-credit"><span>Built by Ayush</span><span>·</span><a href="https://github.com/ayushhagarwal/troy-hard" target="_blank" rel="noopener noreferrer" onClick={() => trackGameEvent("creator_click", { surface: "results_github" })}>GitHub</a></p>
        </div>
        {notice ? <p className="share-notice" role="status">{notice}</p> : null}
      </section>
    </main>
  )
}

export function bestKey(config: RunConfig) {
  return `${config.mode}:${config.seed}:r${config.rulesetVersion}:${config.modifierMask}`
}
