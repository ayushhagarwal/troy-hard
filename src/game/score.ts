import { RUN_LIMIT_MS, TRACK_LENGTH_M, type RunOutcome } from "../types"

export function rankForScore(score: number): string {
  if (score >= 9_000) return "MYTHICALLY SUBTLE"
  if (score >= 7_500) return "TOTALLY NORMAL GIFT"
  if (score >= 6_000) return "HORSE ENOUGH"
  if (score >= 5_000) return "THEY LET IT IN SOMEHOW"
  return "THE ROAD REMEMBERS"
}

export function calculateScore(input: {
  outcome: RunOutcome
  elapsedMs: number
  suspicionPct: number
  conditionPct: number
  progressM: number
}): number {
  if (input.outcome !== "success") {
    return Math.min(4_999, Math.max(0, Math.round((input.progressM / TRACK_LENGTH_M) * 4_999)))
  }

  const timeRatio = Math.max(0, Math.min(1, (RUN_LIMIT_MS - input.elapsedMs) / 30_000))
  const stealthRatio = Math.max(0, Math.min(1, 1 - input.suspicionPct / 100))
  const conditionRatio = Math.max(0, Math.min(1, input.conditionPct / 100))

  return Math.round(5_000 + timeRatio * 2_000 + stealthRatio * 2_000 + conditionRatio * 1_000)
}
