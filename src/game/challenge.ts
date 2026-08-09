import { RULESET_VERSION, type RunConfig, type RunResult } from "../types"

const TOKEN_PATTERN = /^v1\.([0-9a-z]+)\.([0-9a-z]+)\.([0-9a-z]+)\.([0-9a-z]+)\.([0-9a-z]+)\.([0-9a-z]+)\.([0-9a-z]+)$/
const MAX_TOKEN_LENGTH = 120

function crc32(value: string): number {
  let crc = 0xffffffff
  for (let index = 0; index < value.length; index += 1) {
    crc ^= value.charCodeAt(index)
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function parseBase36(value: string, max: number): number | null {
  if (!/^[0-9a-z]+$/.test(value)) return null
  const parsed = Number.parseInt(value, 36)
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= max ? parsed : null
}

export function encodeChallenge(result: RunResult): string {
  const fields = [
    result.config.seed >>> 0,
    result.config.rulesetVersion,
    result.score,
    result.elapsedMs,
    result.suspicionPct,
    result.config.modifierMask,
  ].map((value) => value.toString(36))
  const body = `v1.${fields.join(".")}`
  return `${body}.${crc32(body).toString(36)}`
}

export function decodeChallenge(token: string): RunConfig | null {
  if (!token || token.length > MAX_TOKEN_LENGTH) return null
  const match = TOKEN_PATTERN.exec(token.toLowerCase())
  if (!match) return null
  const body = token.slice(0, token.lastIndexOf(".")).toLowerCase()
  const checksum = parseBase36(match[7], 0xffffffff)
  if (checksum === null || checksum !== crc32(body)) return null

  const seed = parseBase36(match[1], 0xffffffff)
  const rules = parseBase36(match[2], RULESET_VERSION)
  const score = parseBase36(match[3], 10_000)
  const elapsed = parseBase36(match[4], 90_000)
  const suspicion = parseBase36(match[5], 100)
  const modifiers = parseBase36(match[6], 1)
  if ([seed, rules, score, elapsed, suspicion, modifiers].some((value) => value === null)) return null
  if (rules === 0 || score! > 10_000 || elapsed! < 0) return null

  return {
    schemaVersion: 1,
    rulesetVersion: rules!,
    mode: "duel",
    seed: seed!,
    modifierMask: modifiers!,
    targetScore: score!,
    targetElapsedMs: elapsed!,
    targetSuspicionPct: suspicion!,
  }
}

export function challengeTokenFromLocation(location: Pick<Location, "pathname" | "search">): string | null {
  const queryToken = new URLSearchParams(location.search).get("c")
  if (queryToken) return queryToken
  const match = location.pathname.match(/^\/c\/([^/]+)$/)
  return match?.[1] ?? null
}

export function buildChallengeURL(result: RunResult, origin = "https://troy-hard-ayushhagarwals-projects.vercel.app"): string {
  return `${origin.replace(/\/$/, "")}/c/${encodeChallenge(result)}`
}

export function shareCaption(result: RunResult): string {
  if (result.outcome === "success") {
    return `I got the horse into Troy in ${(result.elapsedMs / 1_000).toFixed(1)}s with ${result.suspicionPct}% suspicion. The Trojans suspected nothing. Same siege—beat ${result.score.toLocaleString()}:`
  }
  return `My completely ordinary horse made it ${result.progressM.toFixed(0)}m toward Troy. The road had questions. Beat ${result.score.toLocaleString()}:`
}

export function buildShareIntent(result: RunResult, origin?: string): string {
  const url = buildChallengeURL(result, origin)
  const params = new URLSearchParams({
    text: `${shareCaption(result)}\n\n${url}`,
    hashtags: "TroyHard",
  })
  return `https://x.com/intent/post?${params.toString()}`
}
