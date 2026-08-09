import { describe, expect, it } from "vitest"
import { createCourse, createDailySeed, getAct } from "./course"

describe("deterministic courses", () => {
  it("uses UTC date and ruleset for the daily seed", () => {
    const lateUtc = new Date("2026-08-09T23:59:59.999Z")
    const earlyUtc = new Date("2026-08-09T00:00:00.001Z")
    expect(createDailySeed(lateUtc, 1)).toBe(createDailySeed(earlyUtc, 1))
    expect(createDailySeed(lateUtc, 1)).not.toBe(createDailySeed(lateUtc, 2))
  })

  it("creates exactly the same authored combination for a seed", () => {
    const daily = createCourse(0xdecafbad, "daily")
    const duel = createCourse(0xdecafbad, "duel")
    expect({ variants: duel.variants, inspections: duel.inspections, roughnessScale: duel.roughnessScale })
      .toEqual({ variants: daily.variants, inspections: daily.inspections, roughnessScale: daily.roughnessScale })
    expect(createCourse(21, "daily").variants.every((variant) => variant === 0 || variant === 1)).toBe(true)
  })

  it("advances through the three acts at authored boundaries", () => {
    expect(getAct(0)).toBe("pull")
    expect(getAct(31)).toBe("inspection")
    expect(getAct(72)).toBe("gate")
  })
})
