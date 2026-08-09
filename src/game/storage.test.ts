import { beforeEach, describe, expect, it, vi } from "vitest"
import type { RunResult } from "../types"

const result: RunResult = {
  config: { schemaVersion: 1, rulesetVersion: 1, mode: "practice", seed: 7, modifierMask: 0 },
  outcome: "timeout",
  elapsedMs: 90_000,
  score: 2_400,
  suspicionPct: 10,
  conditionPct: 80,
  progressM: 48,
  rank: "THE ROAD REMEMBERS",
  assisted: false,
}

describe("local profile recovery", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it("recovers safely from corrupted storage", async () => {
    localStorage.setItem("troy-hard:v1", "{broken")
    const { loadProfile } = await import("./storage")
    expect(loadProfile().storageVersion).toBe(1)
    expect(loadProfile().recentRuns).toEqual([])
  })

  it("caps recent runs and retains the best score", async () => {
    const { loadProfile, recordRun } = await import("./storage")
    let profile = loadProfile()
    for (let index = 0; index < 25; index += 1) profile = recordRun(profile, { ...result, score: index })
    expect(profile.recentRuns).toHaveLength(20)
    expect(Object.values(profile.personalBests)[0]?.score).toBe(24)
  })
})
