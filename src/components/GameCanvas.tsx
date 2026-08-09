import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"
import type { AccessibilitySettings, RunConfig, RunResult, SimulationSnapshot } from "../types"

interface GameCanvasProps {
  runConfig: RunConfig
  settings: AccessibilitySettings
  paused: boolean
  restartSignal: number
  onSnapshot(snapshot: SimulationSnapshot): void
  onFinish(result: RunResult): void
  onHeave(): void
  onBrake(): void
  onInspect(): void
  onTensionCritical(): void
  onPauseChange(paused: boolean): void
}

export interface GameCanvasHandle {
  restart(): void
  setPlayerPaused(paused: boolean): void
}

export const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(function GameCanvas(props, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const callbacksRef = useRef(props)
  const restartSignalRef = useRef(props.restartSignal)
  const controllerRef = useRef<{ destroy(): void; restart(): void; setPaused(paused: boolean): void; setPlayerPaused(paused: boolean): void; setSettings(settings: AccessibilitySettings): void } | null>(null)
  callbacksRef.current = props

  useImperativeHandle(ref, () => ({
    restart() {
      controllerRef.current?.restart()
    },
    setPlayerPaused(paused) {
      controllerRef.current?.setPlayerPaused(paused)
    },
  }), [])

  useEffect(() => {
    let disposed = false
    const container = containerRef.current
    if (!container) return

    void import("../game/runtime").then(({ createTroyGame }) => {
      if (disposed) return
      controllerRef.current = createTroyGame({
        parent: container,
        runConfig: callbacksRef.current.runConfig,
        settings: callbacksRef.current.settings,
        callbacks: {
          onSnapshot: (snapshot) => callbacksRef.current.onSnapshot(snapshot),
          onFinish: (result) => callbacksRef.current.onFinish(result),
          onHeave: () => callbacksRef.current.onHeave(),
          onBrake: () => callbacksRef.current.onBrake(),
          onInspect: () => callbacksRef.current.onInspect(),
          onTensionCritical: () => callbacksRef.current.onTensionCritical(),
          onPauseChange: (paused) => callbacksRef.current.onPauseChange(paused),
        },
      })
      controllerRef.current.setPaused(callbacksRef.current.paused)
    })

    return () => {
      disposed = true
      controllerRef.current?.destroy()
      controllerRef.current = null
    }
  }, [props.runConfig.seed, props.runConfig.rulesetVersion, props.runConfig.modifierMask])

  useEffect(() => {
    controllerRef.current?.setPaused(props.paused)
  }, [props.paused])

  useEffect(() => {
    controllerRef.current?.setSettings(props.settings)
  }, [props.settings])

  useEffect(() => {
    if (restartSignalRef.current === props.restartSignal) return
    restartSignalRef.current = props.restartSignal
    controllerRef.current?.restart()
  }, [props.restartSignal])

  return <div ref={containerRef} className="game-canvas" aria-label="Troy Hard game world" />
})
