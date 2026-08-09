import { DEFAULT_SETTINGS, type LocalProfile, type RunResult } from "../types"

const STORAGE_KEY = "troy-hard:v1"
let cachedProfile: LocalProfile | null = null

function freshProfile(): LocalProfile {
  return {
    storageVersion: 1,
    settings: { ...DEFAULT_SETTINGS },
    personalBests: {},
    recentRuns: [],
  }
}

export function loadProfile(): LocalProfile {
  if (cachedProfile) return cachedProfile
  if (typeof localStorage === "undefined") return freshProfile()
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<LocalProfile> | null
    if (!parsed || parsed.storageVersion !== 1) throw new Error("Unsupported local profile")
    cachedProfile = {
      ...freshProfile(),
      ...parsed,
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
      personalBests: parsed.personalBests ?? {},
      recentRuns: Array.isArray(parsed.recentRuns) ? parsed.recentRuns.slice(0, 20) : [],
    }
  } catch {
    cachedProfile = freshProfile()
  }
  return cachedProfile
}

export function saveProfile(profile: LocalProfile) {
  cachedProfile = profile
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  } catch {
    // The game remains fully playable when storage is disabled or full.
  }
}

export function recordRun(profile: LocalProfile, result: RunResult): LocalProfile {
  const key = `${result.config.mode}:${result.config.seed}:r${result.config.rulesetVersion}:${result.config.modifierMask}`
  const existing = profile.personalBests[key]
  const personalBests =
    !existing || result.score > existing.score
      ? { ...profile.personalBests, [key]: result }
      : profile.personalBests
  const next = {
    ...profile,
    personalBests,
    recentRuns: [result, ...profile.recentRuns].slice(0, 20),
  }
  saveProfile(next)
  return next
}

export function clearProfile(): LocalProfile {
  cachedProfile = freshProfile()
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore unavailable storage.
  }
  return cachedProfile
}
