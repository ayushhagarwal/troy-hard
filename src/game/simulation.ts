import {
  GATE_SAFE_SPEED,
  RUN_LIMIT_MS,
  TRACK_LENGTH_M,
  type InputFrame,
  type RunConfig,
  type RunOutcome,
  type RunResult,
  type SimulationSnapshot,
} from "../types"
import { createCourse, getAct, sampleTerrain, type CourseDefinition } from "./course"
import { calculateScore, rankForScore } from "./score"

const FIXED_STEP_SECONDS = 1 / 60

export class RunSimulation {
  readonly course: CourseDefinition
  private elapsedMs = 0
  private progressM = 0
  private velocity = 0
  private pitch = 0
  private pitchVelocity = 0
  private balance = 0
  private tension = 0.12
  private heaveLoad = 0
  private conditionPct = 100
  private suspicionPct = 0
  private inspectionIndex = -1
  private inspectionPhase: "idle" | "telegraph" | "active" = "idle"
  private inspectionTimerMs = 0
  private nextInspection = 0
  private rolloverTimer = 0
  private tensionTimer = 0
  private ended = false
  private outcome?: RunOutcome

  constructor(readonly config: RunConfig) {
    this.course = createCourse(config.seed, config.mode)
  }

  step(input: InputFrame): SimulationSnapshot {
    if (this.ended) return this.snapshot()

    const dt = FIXED_STEP_SECONDS
    this.elapsedMs += dt * 1_000
    this.balance = Math.max(-1, Math.min(1, input.balance))

    const terrain = sampleTerrain(this.progressM, this.course)
    const act = getAct(this.progressM)
    const maxSpeed = act === "gate" ? 1.72 : act === "inspection" ? 1.86 : 1.96
    this.heaveLoad = input.heave
      ? Math.min(1, this.heaveLoad + dt / 0.32)
      : Math.max(0, this.heaveLoad - dt / 0.18)
    const pullForce = input.heave ? this.heaveLoad * (2.78 - terrain.slope * 2.05) : 0
    const brakeForce = input.heave ? 0.14 : this.progressM > 97 ? 1.65 : 2.75
    const acceleration = pullForce - brakeForce - terrain.slope * 0.8 - this.velocity * 0.17
    this.velocity = Math.max(0, Math.min(maxSpeed, this.velocity + acceleration * dt))
    this.progressM = Math.min(TRACK_LENGTH_M, this.progressM + this.velocity * dt)

    const desiredPitch = terrain.roughness * 12.8 + terrain.slope * 18 + this.balance * 16 + acceleration * 0.9
    const stability = this.config.modifierMask & 1 ? 7.8 : 6.1
    const damping = this.config.modifierMask & 1 ? 4.3 : 3.5
    this.pitchVelocity += ((desiredPitch - this.pitch) * stability - this.pitchVelocity * damping) * dt
    this.pitch += this.pitchVelocity * dt

    const tensionTarget = input.heave
      ? 0.27 + this.heaveLoad * 0.16 + terrain.slope * 1.65 + Math.abs(this.pitch) * 0.015 + (1 - this.velocity / maxSpeed) * 0.24
      : 0.08
    this.tension += (tensionTarget - this.tension) * Math.min(1, dt * (input.heave ? 2.4 : 5.2))
    this.tension = Math.max(0, Math.min(1.05, this.tension))

    if (Math.abs(this.pitch) > 19) {
      this.conditionPct = Math.max(0, this.conditionPct - (Math.abs(this.pitch) - 18) * dt * 0.48)
    }

    this.updateInspection(input, dt * 1_000)
    this.updateFailures(dt)

    if (!this.ended && this.progressM >= 99.2) {
      this.finish(this.velocity > GATE_SAFE_SPEED ? "gate_crash" : "success")
    } else if (!this.ended && this.elapsedMs >= RUN_LIMIT_MS) {
      this.finish("timeout")
    }

    return this.snapshot()
  }

  private updateInspection(input: InputFrame, dtMs: number) {
    if (this.inspectionPhase === "idle") {
      const point = this.course.inspections[this.nextInspection]
      if (point && this.progressM >= point.positionM) {
        this.inspectionIndex = this.nextInspection
        this.nextInspection += 1
        this.inspectionPhase = "telegraph"
        this.inspectionTimerMs = 0
      }
      return
    }

    const point = this.course.inspections[this.inspectionIndex]
    this.inspectionTimerMs += dtMs
    if (this.inspectionPhase === "telegraph" && this.inspectionTimerMs >= point.telegraphMs) {
      this.inspectionPhase = "active"
      this.inspectionTimerMs = 0
      return
    }

    if (this.inspectionPhase === "active") {
      const movement = Math.max(0, this.velocity - 0.18) * 15
      const wobble = Math.max(0, Math.abs(this.pitch) - 4) * 0.95
      const weightNoise = Math.max(0, Math.abs(this.balance) - 0.18) * 11
      const heaveNoise = input.heave ? 9 : 0
      const exposure = movement + wobble + weightNoise + heaveNoise
      const practiceGrace = this.config.mode === "practice" && this.inspectionIndex === 0 ? 0 : 1
      this.suspicionPct = Math.min(100, this.suspicionPct + exposure * (dtMs / 1_000) * practiceGrace)

      if (this.inspectionTimerMs >= point.activeMs) {
        this.inspectionPhase = "idle"
        this.inspectionTimerMs = 0
      }
    }
  }

  private updateFailures(dt: number) {
    const rolloverLimit = this.config.modifierMask & 1 ? 38 : 32
    this.rolloverTimer = Math.abs(this.pitch) > rolloverLimit ? this.rolloverTimer + dt : Math.max(0, this.rolloverTimer - dt * 2)
    this.tensionTimer = this.tension > 0.97 ? this.tensionTimer + dt : Math.max(0, this.tensionTimer - dt * 2)

    if (this.suspicionPct >= 100) this.finish("spotted")
    else if (this.rolloverTimer >= 0.68 || this.conditionPct <= 0) this.finish("rollover")
    else if (this.tensionTimer >= 0.85) this.finish("rope_break")
  }

  private finish(outcome: RunOutcome) {
    this.ended = true
    this.outcome = outcome
  }

  forceFinish(outcome: RunOutcome) {
    this.progressM = outcome === "success" ? TRACK_LENGTH_M : Math.max(this.progressM, 94)
    this.velocity = outcome === "success" ? 0.72 : this.velocity
    this.finish(outcome)
    return this.snapshot()
  }

  forceInspection(active = false) {
    if (this.ended) return this.snapshot()
    const point = this.course.inspections[this.nextInspection] ?? this.course.inspections.at(-1)
    if (!point) return this.snapshot()
    this.progressM = point.positionM
    this.velocity = Math.min(this.velocity, 0.45)
    this.inspectionIndex = Math.max(0, this.nextInspection)
    this.nextInspection = Math.min(this.course.inspections.length, this.inspectionIndex + 1)
    this.inspectionPhase = active ? "active" : "telegraph"
    this.inspectionTimerMs = 0
    return this.snapshot()
  }

  snapshot(): SimulationSnapshot {
    const terrain = sampleTerrain(this.progressM, this.course)
    const score = this.outcome
      ? calculateScore({
          outcome: this.outcome,
          elapsedMs: this.elapsedMs,
          suspicionPct: this.suspicionPct,
          conditionPct: this.conditionPct,
          progressM: this.progressM,
        })
      : Math.min(4_999, Math.round((this.progressM / TRACK_LENGTH_M) * 4_999))
    const point = this.inspectionIndex >= 0 ? this.course.inspections[this.inspectionIndex] : undefined
    const phaseDuration = this.inspectionPhase === "telegraph" ? point?.telegraphMs : point?.activeMs

    return {
      act: getAct(this.progressM),
      elapsedMs: Math.round(this.elapsedMs),
      progressM: this.progressM,
      distanceM: Math.max(0, TRACK_LENGTH_M - this.progressM),
      velocity: this.velocity,
      gateSafeSpeed: GATE_SAFE_SPEED,
      heaveLoad: this.heaveLoad,
      terrainRoughness: terrain.roughness,
      terrainSlope: terrain.slope,
      pitch: this.pitch,
      pitchVelocity: this.pitchVelocity,
      balance: this.balance,
      tension: this.tension,
      conditionPct: this.conditionPct,
      suspicionPct: this.suspicionPct,
      score,
      inspection: {
        phase: this.inspectionPhase,
        progress: phaseDuration ? Math.min(1, this.inspectionTimerMs / phaseDuration) : 0,
        index: this.inspectionIndex,
      },
      truthPulse: this.inspectionPhase === "active",
      ended: this.ended,
      outcome: this.outcome,
    }
  }

  result(): RunResult | null {
    if (!this.outcome) return null
    const snapshot = this.snapshot()
    return {
      config: this.config,
      outcome: this.outcome,
      elapsedMs: snapshot.elapsedMs,
      score: snapshot.score,
      suspicionPct: Math.round(snapshot.suspicionPct),
      conditionPct: Math.round(snapshot.conditionPct),
      progressM: Number(snapshot.progressM.toFixed(1)),
      rank: rankForScore(snapshot.score),
      assisted: Boolean(this.config.modifierMask & 1),
    }
  }
}
