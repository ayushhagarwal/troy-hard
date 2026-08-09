import { describe, expect, it } from "vitest"
import { calculateScore, rankForScore } from "./score"

describe("scoring", () => {
  it("keeps every failure below every success", () => {
    const failed = calculateScore({ outcome: "timeout", elapsedMs: 90_000, suspicionPct: 99, conditionPct: 1, progressM: 100 })
    const success = calculateScore({ outcome: "success", elapsedMs: 90_000, suspicionPct: 100, conditionPct: 0, progressM: 100 })
    expect(failed).toBe(4_999)
    expect(success).toBe(5_000)
  })

  it.each([
    [9_000, "MYTHICALLY SUBTLE"],
    [7_500, "TOTALLY NORMAL GIFT"],
    [6_000, "HORSE ENOUGH"],
    [5_000, "THEY LET IT IN SOMEHOW"],
    [4_999, "THE ROAD REMEMBERS"],
  ])("maps %i to %s", (score, rank) => expect(rankForScore(score)).toBe(rank))
})
