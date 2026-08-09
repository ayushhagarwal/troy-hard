import { describe, expect, it } from "vitest"
import { buildShareIntent, decodeChallenge, encodeChallenge } from "./challenge"
import type { RunResult } from "../types"

const result: RunResult = {
  config: { schemaVersion: 1, rulesetVersion: 1, mode: "daily", seed: 0xf00dbabe, modifierMask: 1 },
  outcome: "success",
  elapsedMs: 72_400,
  score: 8_420,
  suspicionPct: 3,
  conditionPct: 92,
  progressM: 100,
  rank: "TOTALLY NORMAL GIFT",
  assisted: true,
}

describe("challenge codec", () => {
  it("round-trips friendly competition fields", () => {
    const token = encodeChallenge(result)
    expect(token.length).toBeLessThan(120)
    expect(decodeChallenge(token)).toEqual({
      schemaVersion: 1,
      rulesetVersion: 1,
      mode: "duel",
      seed: result.config.seed,
      modifierMask: 1,
      targetScore: 8_420,
      targetElapsedMs: 72_400,
      targetSuspicionPct: 3,
    })
  })

  it.each(["", "v1.hello", "v1.1.1.1.1.1.1.zz", "x".repeat(121)])("rejects malformed token %s", (token) => {
    expect(decodeChallenge(token)).toBeNull()
  })

  it("builds an encoded X intent without executable values", () => {
    const intent = new URL(buildShareIntent(result, "https://example.test"))
    expect(intent.origin).toBe("https://x.com")
    expect(intent.searchParams.get("hashtags")).toBe("TroyHard")
    expect(intent.searchParams.get("text")).toContain("https://example.test/c/v1.")
  })
})
