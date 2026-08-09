import type { GameAct, GameMode } from "../types"

export interface InspectionPoint {
  positionM: number
  telegraphMs: number
  activeMs: number
}

export interface CourseDefinition {
  seed: number
  mode: GameMode
  variants: readonly [number, number, number]
  inspections: InspectionPoint[]
  roughnessScale: number
}

function mulberry32(seed: number) {
  let value = seed >>> 0
  return () => {
    value += 0x6d2b79f5
    let next = value
    next = Math.imul(next ^ (next >>> 15), next | 1)
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61)
    return ((next ^ (next >>> 14)) >>> 0) / 4_294_967_296
  }
}

export function hashString(value: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

export function createDailySeed(date = new Date(), rulesetVersion = 1): number {
  const utcDate = date.toISOString().slice(0, 10)
  return hashString(`${utcDate}|${rulesetVersion}|troy-hard`)
}

export function createCourse(seed: number, mode: GameMode): CourseDefinition {
  if (mode === "practice") {
    return {
      seed,
      mode,
      variants: [0, 0, 0],
      inspections: [
        { positionM: 21, telegraphMs: 1_600, activeMs: 2_000 },
        { positionM: 52, telegraphMs: 1_500, activeMs: 2_200 },
        { positionM: 79, telegraphMs: 1_500, activeMs: 2_200 },
      ],
      roughnessScale: 0.78,
    }
  }

  const random = mulberry32(seed)
  const variants = [random() > 0.5 ? 1 : 0, random() > 0.5 ? 1 : 0, random() > 0.5 ? 1 : 0] as const
  const courseIndex = variants[0] | (variants[1] << 1) | (variants[2] << 2)
  const authoredRoughness = [0.98, 1.05, 1.02, 1.08, 1.04, 1.1, 1.07, 1.12] as const
  return {
    seed,
    mode,
    variants,
    inspections: [
      { positionM: 19 + variants[0] * 3, telegraphMs: 1_500, activeMs: 2_100 },
      { positionM: 43 + variants[1] * 4, telegraphMs: 1_400, activeMs: 2_250 },
      { positionM: 65 + variants[1] * 3, telegraphMs: 1_350, activeMs: 2_300 },
      { positionM: 83 + variants[2] * 2, telegraphMs: 1_250, activeMs: 2_350 },
    ],
    roughnessScale: authoredRoughness[courseIndex],
  }
}

export function getAct(progressM: number): GameAct {
  if (progressM < 31) return "pull"
  if (progressM < 72) return "inspection"
  return "gate"
}

export function sampleTerrain(progressM: number, course: CourseDefinition) {
  const act = getAct(progressM)
  const actIndex = act === "pull" ? 0 : act === "inspection" ? 1 : 2
  const variant = course.variants[actIndex]
  const courseIndex = course.variants[0] | (course.variants[1] << 1) | (course.variants[2] << 2)
  const actRoughness = act === "pull" ? 0.42 : act === "inspection" ? 0.78 : 1.08
  const waveA = Math.sin(progressM * (0.39 + variant * 0.045))
  const waveB = Math.sin(progressM * 0.91 + courseIndex * 0.73 + actIndex * 0.41) * 0.36
  const bump = Math.max(0, Math.sin(progressM * 0.235 + variant * 1.8)) ** 8
  const slope = act === "pull" ? 0.08 : act === "inspection" ? 0.12 : 0.19

  return {
    slope,
    roughness: (waveA + waveB + bump * 1.35) * actRoughness * course.roughnessScale,
  }
}
