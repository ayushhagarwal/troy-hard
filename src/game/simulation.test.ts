import { describe, expect, it } from "vitest"
import { RunSimulation } from "./simulation"
import type { RunConfig, SimulationSnapshot } from "../types"

const config: RunConfig = { schemaVersion: 1, rulesetVersion: 1, mode: "daily", seed: 1_234_567, modifierMask: 0 }

function recordedRun(renderFps: number): SimulationSnapshot {
  const simulation = new RunSimulation(config)
  let accumulator = 0
  let fixedFrames = 0
  let snapshot = simulation.snapshot()
  const renderDelta = 1_000 / renderFps
  while (fixedFrames < 3_000 && !snapshot.ended) {
    accumulator += renderDelta
    while (accumulator + 0.00001 >= 1_000 / 60 && fixedFrames < 3_000 && !snapshot.ended) {
      const cycle = fixedFrames % 240
      snapshot = simulation.step({ heave: cycle < 185, balance: Math.sin(fixedFrames / 80) * 0.28 })
      accumulator -= 1_000 / 60
      fixedFrames += 1
    }
  }
  return snapshot
}

describe("fixed-step simulation", () => {
  it("produces the same state at 30, 60, and 120 render fps", () => {
    const at30 = recordedRun(30)
    expect(recordedRun(60)).toEqual(at30)
    expect(recordedRun(120)).toEqual(at30)
  })

  it("requires sustained bad state and resolves a forced result", () => {
    const simulation = new RunSimulation(config)
    const initial = simulation.step({ heave: true, balance: 1 })
    expect(initial.ended).toBe(false)
    expect(simulation.forceFinish("gate_crash").outcome).toBe("gate_crash")
    expect(simulation.result()?.score).toBeLessThan(5_000)
  })
})
