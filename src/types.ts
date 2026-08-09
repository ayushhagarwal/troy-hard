export type GameMode = "practice" | "daily" | "duel"
export type GameAct = "pull" | "inspection" | "gate"
export type RunOutcome =
  | "success"
  | "spotted"
  | "rollover"
  | "rope_break"
  | "gate_crash"
  | "timeout"

export interface AccessibilitySettings {
  muted: boolean
  reducedMotion: boolean
  highContrast: boolean
  steadyHorse: boolean
}

export interface RunConfig {
  schemaVersion: 1
  rulesetVersion: number
  mode: GameMode
  seed: number
  modifierMask: number
  targetScore?: number
  targetElapsedMs?: number
  targetSuspicionPct?: number
}

export interface RunResult {
  config: RunConfig
  outcome: RunOutcome
  elapsedMs: number
  score: number
  suspicionPct: number
  conditionPct: number
  progressM: number
  rank: string
  assisted: boolean
}

export interface LocalProfile {
  storageVersion: 1
  settings: AccessibilitySettings
  personalBests: Record<string, RunResult>
  recentRuns: RunResult[]
}

export interface InputFrame {
  heave: boolean
  balance: number
}

export interface InspectionSnapshot {
  phase: "idle" | "telegraph" | "active"
  progress: number
  index: number
}

export interface SimulationSnapshot {
  act: GameAct
  elapsedMs: number
  progressM: number
  distanceM: number
  velocity: number
  gateSafeSpeed: number
  heaveLoad: number
  terrainRoughness: number
  terrainSlope: number
  pitch: number
  pitchVelocity: number
  balance: number
  tension: number
  conditionPct: number
  suspicionPct: number
  score: number
  inspection: InspectionSnapshot
  truthPulse: boolean
  ended: boolean
  outcome?: RunOutcome
}

export const RULESET_VERSION = 1
export const TRACK_LENGTH_M = 100
export const RUN_LIMIT_MS = 90_000
export const GATE_SAFE_SPEED = 1.02

export const DEFAULT_SETTINGS: AccessibilitySettings = {
  muted: false,
  reducedMotion: false,
  highContrast: false,
  steadyHorse: false,
}
