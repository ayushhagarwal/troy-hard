import { useEffect, useRef, useState } from "react"
import { GameCanvas, type GameCanvasHandle } from "./components/GameCanvas"
import { Hud } from "./components/Hud"
import { InfoPage } from "./components/InfoPage"
import { PauseOverlay } from "./components/PauseOverlay"
import { ResultsScreen, bestKey } from "./components/ResultsScreen"
import { SettingsPanel } from "./components/SettingsPanel"
import { TitleScreen } from "./components/TitleScreen"
import { Telemetry } from "./components/Telemetry"
import { AudioDirector } from "./game/audio"
import { scoreBucket, trackGameEvent } from "./game/analytics"
import { challengeTokenFromLocation, decodeChallenge } from "./game/challenge"
import { createDailySeed, hashString } from "./game/course"
import { clearProfile, loadProfile, recordRun, saveProfile } from "./game/storage"
import {
  DEFAULT_SETTINGS,
  RULESET_VERSION,
  type AccessibilitySettings,
  type GameMode,
  type LocalProfile,
  type RunConfig,
  type RunResult,
  type SimulationSnapshot,
} from "./types"

type AppScreen = "title" | "game" | "results"

function runConfigFor(mode: Exclude<GameMode, "duel">, settings: AccessibilitySettings): RunConfig {
  return {
    schemaVersion: 1,
    rulesetVersion: RULESET_VERSION,
    mode,
    seed: mode === "daily" ? createDailySeed() : hashString("troy-hard-practice-v1"),
    modifierMask: settings.steadyHorse ? 1 : 0,
  }
}

export default function App() {
  const path = window.location.pathname.replace(/\/$/, "")
  if (path === "/making-of") return <><InfoPage kind="making-of" /><Telemetry /></>
  if (path === "/credits") return <><InfoPage kind="credits" /><Telemetry /></>
  return <GameApp />
}

function GameApp() {
  const [profile, setProfile] = useState<LocalProfile>(() => loadProfile())
  const [settings, setSettings] = useState<AccessibilitySettings>(() => loadProfile().settings ?? DEFAULT_SETTINGS)
  const [initialChallenge] = useState(() => {
    const token = challengeTokenFromLocation(window.location)
    const duelConfig = token ? decodeChallenge(token) : null
    return {
      duelConfig,
      invalid: Boolean(token && !duelConfig) || new URLSearchParams(window.location.search).get("invalidChallenge") === "1",
    }
  })
  const [runConfig, setRunConfig] = useState<RunConfig>(() => initialChallenge.duelConfig ?? runConfigFor("daily", settings))
  const [screen, setScreen] = useState<AppScreen>("title")
  const [snapshot, setSnapshot] = useState<SimulationSnapshot | null>(null)
  const [result, setResult] = useState<RunResult | null>(null)
  const [priorBest, setPriorBest] = useState<RunResult | undefined>()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [learnedHeave, setLearnedHeave] = useState(false)
  const [learnedBalance, setLearnedBalance] = useState(false)
  const [learnedBrake, setLearnedBrake] = useState(false)
  const [playerPaused, setPlayerPaused] = useState(false)
  const [restartSignal, setRestartSignal] = useState(0)
  const gameRef = useRef<GameCanvasHandle>(null)
  const audioRef = useRef<AudioDirector | null>(null)
  if (!audioRef.current) audioRef.current = new AudioDirector()

  useEffect(() => () => audioRef.current?.destroy(), [])

  useEffect(() => {
    const prefetchRuntime = window.setTimeout(() => { void import("./game/runtime") }, 700)
    return () => window.clearTimeout(prefetchRuntime)
  }, [])

  useEffect(() => {
    const syncAudioPause = () => audioRef.current?.setPaused(settingsOpen || playerPaused || screen !== "game" || document.hidden)
    syncAudioPause()
    document.addEventListener("visibilitychange", syncAudioPause)
    return () => document.removeEventListener("visibilitychange", syncAudioPause)
  }, [playerPaused, screen, settingsOpen])

  useEffect(() => {
    const onRetryKey = (event: KeyboardEvent) => {
      if (event.code !== "KeyR" || (screen !== "game" && screen !== "results")) return
      event.preventDefault()
      retry()
    }
    window.addEventListener("keydown", onRetryKey)
    return () => window.removeEventListener("keydown", onRetryKey)
  }, [screen])

  function updateSettings(next: AccessibilitySettings) {
    setSettings(next)
    const nextProfile = { ...profile, settings: next }
    setProfile(nextProfile)
    saveProfile(nextProfile)
    audioRef.current?.setMuted(next.muted)
    if (screen === "title" && runConfig.mode !== "duel") setRunConfig(runConfigFor(runConfig.mode, next))
  }

  function begin(config = runConfig) {
    void audioRef.current?.start(settings.muted)
    setRunConfig({
      ...config,
      modifierMask: config.mode === "duel" ? config.modifierMask : settings.steadyHorse ? 1 : 0,
    })
    setSnapshot(null)
    setResult(null)
    setPlayerPaused(false)
    setScreen("game")
    trackGameEvent("game_start", { mode: config.mode, ruleset: config.rulesetVersion, challenged: config.mode === "duel" })
  }

  function finishRun(nextResult: RunResult) {
    const previous = profile.personalBests[bestKey(nextResult.config)]
    setPriorBest(previous)
    const nextProfile = recordRun(profile, nextResult)
    setProfile(nextProfile)
    setResult(nextResult)
    setPlayerPaused(false)
    setScreen("results")
    audioRef.current?.setIntensity("idle")
    audioRef.current?.sfx(nextResult.outcome === "success" ? "success" : "fail")
    trackGameEvent("game_end", {
      mode: nextResult.config.mode,
      outcome: nextResult.outcome,
      score_bucket: scoreBucket(nextResult.score),
      duration_bucket: nextResult.elapsedMs < 60_000 ? "under_60" : nextResult.elapsedMs < 75_000 ? "60_75" : "75_90",
      challenged: nextResult.config.mode === "duel",
    })
  }

  function retry() {
    if (["127.0.0.1", "localhost"].includes(window.location.hostname) && new URLSearchParams(window.location.search).has("test")) {
      const testWindow = window as typeof window & { __TROY_RETRY_REQUEST_MS__?: number }
      testWindow.__TROY_RETRY_REQUEST_MS__ = performance.now()
    }
    trackGameEvent("replay_click", { same_seed: true })
    setResult(null)
    setScreen("game")
    setSnapshot(null)
    setPlayerPaused(false)
    setRestartSignal((value) => value + 1)
  }

  function returnToTitle() {
    const nextConfig = runConfigFor("daily", settings)
    setRunConfig(nextConfig)
    setScreen("title")
    setResult(null)
    setSnapshot(null)
    setPlayerPaused(false)
    history.replaceState(null, "", "/")
  }

  const classes = [
    "app-shell",
    settings.reducedMotion ? "reduce-motion" : "",
    settings.highContrast ? "high-contrast" : "",
  ].filter(Boolean).join(" ")

  return (
    <div className={classes}>
      <div className="app-content" inert={settingsOpen ? true : undefined} aria-hidden={settingsOpen || undefined}>
      {screen === "title" ? (
        <TitleScreen
          config={runConfig}
          soundOn={!settings.muted}
          invalidChallenge={initialChallenge.invalid}
          onBegin={() => begin()}
          onPractice={() => begin(runConfigFor("practice", settings))}
          onSoundToggle={() => updateSettings({ ...settings, muted: !settings.muted })}
          onSettings={() => setSettingsOpen(true)}
        />
      ) : null}
      {screen !== "title" ? (
        <main
          className={`game-screen ${screen === "results" ? "game-screen--under-results" : ""}`}
          aria-hidden={screen === "results"}
          inert={screen !== "game" || playerPaused ? true : undefined}
        >
          <GameCanvas
            ref={gameRef}
            key={`${runConfig.seed}:${runConfig.rulesetVersion}:${runConfig.modifierMask}`}
            runConfig={runConfig}
            settings={settings}
            paused={settingsOpen || screen !== "game"}
            restartSignal={restartSignal}
            onSnapshot={(next) => {
              setSnapshot(next)
              if (Math.abs(next.balance) > 0.22) setLearnedBalance(true)
              audioRef.current?.setIntensity(next.inspection.phase === "active" ? "alarm" : next.inspection.phase === "telegraph" ? "suspicion" : next.velocity > 0.15 ? "pull" : "idle")
            }}
            onFinish={finishRun}
            onHeave={() => { setLearnedHeave(true); audioRef.current?.heave() }}
            onBrake={() => { setLearnedBrake(true); audioRef.current?.sfx("brace") }}
            onInspect={() => audioRef.current?.sfx("inspect")}
            onTensionCritical={() => audioRef.current?.sfx("rope")}
            onPauseChange={setPlayerPaused}
          />
          {snapshot ? (
            <Hud
              snapshot={snapshot}
              learnedHeave={learnedHeave}
              learnedBalance={learnedBalance}
              learnedBrake={learnedBrake}
              onSettings={() => setSettingsOpen(true)}
            />
          ) : <div className="loading-mark">LOADING THE HORSE…</div>}
        </main>
      ) : null}
      {screen === "game" && playerPaused && !settingsOpen ? (
        <PauseOverlay
          onResume={() => gameRef.current?.setPlayerPaused(false)}
          onRetry={retry}
          onTitle={returnToTitle}
        />
      ) : null}
      {screen === "results" && result ? <ResultsScreen result={result} priorBest={priorBest} onRetry={retry} onTitle={returnToTitle} /> : null}
      </div>
      {settingsOpen ? (
        <SettingsPanel
          settings={settings}
          onChange={updateSettings}
          onClearData={() => {
            const next = clearProfile()
            setProfile(next)
            setSettings(next.settings)
            audioRef.current?.setMuted(next.settings.muted)
          }}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}
      <Telemetry />
    </div>
  )
}
