import Phaser from "phaser"
import type { AccessibilitySettings, RunConfig, RunOutcome, RunResult, SimulationSnapshot } from "../types"
import { RunSimulation } from "./simulation"

const FIXED_MS = 1_000 / 60

export interface GameCallbacks {
  onSnapshot(snapshot: SimulationSnapshot): void
  onFinish(result: RunResult): void
  onBrace(): void
  onRelease(): void
  onInspect(): void
  onTensionCritical(): void
  onPauseChange(paused: boolean): void
}

interface RuntimeOptions {
  parent: HTMLElement
  runConfig: RunConfig
  settings: AccessibilitySettings
  callbacks: GameCallbacks
}

interface ControlState {
  brace: boolean
  balance: number
  pointerOriginX: number
  pointerStartBalance: number
  keyboardBalanceDirection: number
}

interface LocalTestBridge {
  instanceId: string
  lastRestartMs: number
  success(): void
  fail(outcome?: RunOutcome): void
  inspect(active?: boolean): void
  snapshot(): SimulationSnapshot
}

function lerpSnapshot(previous: SimulationSnapshot, current: SimulationSnapshot, alpha: number): SimulationSnapshot {
  const lerp = (from: number, to: number) => Phaser.Math.Linear(from, to, alpha)
  return {
    ...current,
    elapsedMs: Math.round(lerp(previous.elapsedMs, current.elapsedMs)),
    progressM: lerp(previous.progressM, current.progressM),
    distanceM: lerp(previous.distanceM, current.distanceM),
    velocity: lerp(previous.velocity, current.velocity),
    braceLoad: lerp(previous.braceLoad, current.braceLoad),
    pullEffort: lerp(previous.pullEffort, current.pullEffort),
    noisePct: lerp(previous.noisePct, current.noisePct),
    terrainRoughness: lerp(previous.terrainRoughness, current.terrainRoughness),
    terrainSlope: lerp(previous.terrainSlope, current.terrainSlope),
    pitch: lerp(previous.pitch, current.pitch),
    pitchVelocity: lerp(previous.pitchVelocity, current.pitchVelocity),
    balance: lerp(previous.balance, current.balance),
    tension: lerp(previous.tension, current.tension),
    conditionPct: lerp(previous.conditionPct, current.conditionPct),
    suspicionPct: lerp(previous.suspicionPct, current.suspicionPct),
  }
}

class TroyScene extends Phaser.Scene {
  private simulation!: RunSimulation
  private background!: Phaser.GameObjects.Image
  private shade!: Phaser.GameObjects.Rectangle
  private horse!: Phaser.GameObjects.Image
  private truthHorse!: Phaser.GameObjects.Image
  private pullTeam!: Phaser.GameObjects.Image
  private rope!: Phaser.GameObjects.Graphics
  private dust!: Phaser.GameObjects.Graphics
  private inspectionCone!: Phaser.GameObjects.Graphics
  private balanceGlyph!: Phaser.GameObjects.Graphics
  private wheelRear!: Phaser.GameObjects.Graphics
  private wheelFront!: Phaser.GameObjects.Graphics
  private keys?: Record<string, Phaser.Input.Keyboard.Key>
  private control: ControlState = { brace: false, balance: 0, pointerOriginX: 0, pointerStartBalance: 0, keyboardBalanceDirection: 0 }
  private accumulator = 0
  private lastSnapshotEmit = 0
  private lastInspectionPhase = "idle"
  private lastBrace = false
  private tensionCritical = false
  private finishQueued = false
  private finishTimer?: number
  private pendingResult?: RunResult
  private previousSnapshot!: SimulationSnapshot
  private currentSnapshot!: SimulationSnapshot
  private testBridge?: LocalTestBridge

  constructor(private readonly options: RuntimeOptions) {
    super({ key: "troy" })
  }

  preload() {
    if (!this.textures.exists("road-desktop")) this.load.image("road-desktop", "/assets/art/troy-road-desktop-crowd.webp")
    if (!this.textures.exists("road-portrait")) this.load.image("road-portrait", "/assets/art/troy-road-portrait-crowd.webp")
    if (!this.textures.exists("horse")) this.load.image("horse", "/assets/art/horse.webp")
    if (!this.textures.exists("pull-team")) this.load.image("pull-team", "/assets/art/pullers.webp")
  }

  create() {
    this.resetRunState()
    this.background = this.add.image(0, 0, this.isPortrait() ? "road-portrait" : "road-desktop").setOrigin(0.5).setDepth(0)
    this.shade = this.add.rectangle(0, 0, 10, 10, 0x171310, 0.08).setOrigin(0).setDepth(1)
    this.dust = this.add.graphics().setDepth(2)
    this.rope = this.add.graphics().setDepth(3)
    this.pullTeam = this.add.image(0, 0, "pull-team").setOrigin(0.5, 0.82).setDepth(4)
    this.horse = this.add.image(0, 0, "horse").setOrigin(0.5, 0.88).setDepth(5)
    this.truthHorse = this.add.image(0, 0, "horse").setOrigin(0.5, 0.88).setTint(0x2b1712).setBlendMode(Phaser.BlendModes.MULTIPLY).setVisible(false).setDepth(6)
    this.wheelRear = this.createWheel().setDepth(7)
    this.wheelFront = this.createWheel().setDepth(7)
    this.inspectionCone = this.add.graphics().setDepth(8)
    this.balanceGlyph = this.add.graphics().setDepth(10)

    this.layout()
    this.scale.on("resize", this.layout, this)

    this.keys = this.input.keyboard?.addKeys({
      brace: Phaser.Input.Keyboard.KeyCodes.SPACE,
      braceAlt: Phaser.Input.Keyboard.KeyCodes.W,
      braceArrow: Phaser.Input.Keyboard.KeyCodes.UP,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      leftArrow: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      rightArrow: Phaser.Input.Keyboard.KeyCodes.RIGHT,
    }) as Record<string, Phaser.Input.Keyboard.Key>

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.finishQueued) {
        this.completeFinish()
        return
      }
      this.control.brace = true
      this.control.pointerOriginX = pointer.x
      this.control.pointerStartBalance = this.control.balance
    })
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown || this.finishQueued) return
      const sensitivity = Math.max(120, this.scale.width * 0.16)
      this.control.balance = Phaser.Math.Clamp(
        this.control.pointerStartBalance + (pointer.x - this.control.pointerOriginX) / sensitivity,
        -1,
        1,
      )
    })
    const releasePointer = () => this.releaseControl()
    const skipFreeze = (event: KeyboardEvent) => {
      if (!this.finishQueued || !["Space", "Enter"].includes(event.code)) return
      event.preventDefault()
      this.completeFinish()
    }
    this.input.on("pointerup", releasePointer)
    this.input.on("pointerupoutside", releasePointer)
    window.addEventListener("blur", releasePointer)
    window.addEventListener("pointercancel", releasePointer)
    window.addEventListener("keydown", skipFreeze)

    if (this.isLocalTestMode()) {
      const bridge: LocalTestBridge = {
        instanceId: crypto.randomUUID(),
        lastRestartMs: 0,
        success: () => this.completeFromTest("success"),
        fail: (outcome: RunOutcome = "rollover") => this.completeFromTest(outcome),
        inspect: (active = false) => {
          this.previousSnapshot = this.currentSnapshot
          this.currentSnapshot = this.simulation.forceInspection(active)
          this.options.callbacks.onSnapshot(this.currentSnapshot)
        },
        snapshot: () => this.simulation.snapshot(),
      }
      const testWindow = window as typeof window & { __TROY_HARD_TEST__?: typeof bridge }
      this.testBridge = bridge
      testWindow.__TROY_HARD_TEST__ = bridge
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        if (testWindow.__TROY_HARD_TEST__ === bridge) delete testWindow.__TROY_HARD_TEST__
      })
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cancelFinish()
      window.removeEventListener("blur", releasePointer)
      window.removeEventListener("pointercancel", releasePointer)
      window.removeEventListener("keydown", skipFreeze)
      this.scale.off("resize", this.layout, this)
    })
  }

  update(_time: number, delta: number) {
    if (!this.simulation || this.finishQueued) return
    this.readKeyboard()
    this.accumulator += Math.min(delta, 100)
    while (this.accumulator >= FIXED_MS) {
      this.control.balance = Phaser.Math.Clamp(
        this.control.balance + this.control.keyboardBalanceDirection * (1 / 60) * 1.8,
        -1,
        1,
      )
      this.previousSnapshot = this.currentSnapshot
      this.currentSnapshot = this.simulation.step({ brace: this.control.brace, balance: this.control.balance })
      this.accumulator -= FIXED_MS
    }

    const visual = lerpSnapshot(this.previousSnapshot, this.currentSnapshot, this.accumulator / FIXED_MS)
    this.updateVisuals(visual)
    if (this.time.now - this.lastSnapshotEmit >= 80 || this.currentSnapshot.ended) {
      this.options.callbacks.onSnapshot(this.currentSnapshot)
      this.lastSnapshotEmit = this.time.now
    }
    if (this.control.brace && !this.lastBrace) this.options.callbacks.onBrace()
    if (!this.control.brace && this.lastBrace) this.options.callbacks.onRelease()
    this.lastBrace = this.control.brace
    if (this.currentSnapshot.inspection.phase === "telegraph" && this.lastInspectionPhase === "idle") {
      this.options.callbacks.onInspect()
    }
    this.lastInspectionPhase = this.currentSnapshot.inspection.phase
    if (this.currentSnapshot.tension >= 0.84 && !this.tensionCritical) {
      this.tensionCritical = true
      this.options.callbacks.onTensionCritical()
    } else if (this.currentSnapshot.tension < 0.7) {
      this.tensionCritical = false
    }

    if (this.currentSnapshot.ended) this.queueFinish()
  }

  private createWheel() {
    const wheel = this.add.graphics()
    wheel.lineStyle(4, 0xa87432, 0.92)
    wheel.strokeCircle(0, 0, 65)
    wheel.lineStyle(2, 0xf1dfc0, 0.38)
    wheel.strokeCircle(0, 0, 49)
    wheel.fillStyle(0xa87432, 0.8)
    wheel.fillCircle(0, 0, 8)
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8
      wheel.lineBetween(Math.cos(angle) * 11, Math.sin(angle) * 11, Math.cos(angle) * 46, Math.sin(angle) * 46)
    }
    return wheel
  }

  private readKeyboard() {
    if (!this.keys) return
    const pointer = this.input.activePointer
    const keyboardBrace = this.keys.brace.isDown || this.keys.braceAlt.isDown || this.keys.braceArrow.isDown
    this.control.brace = pointer.isDown || keyboardBrace
    const left = this.keys.left.isDown || this.keys.leftArrow.isDown
    const right = this.keys.right.isDown || this.keys.rightArrow.isDown
    this.control.keyboardBalanceDirection = left === right ? 0 : right ? 1 : -1
  }

  private updateVisuals(snapshot: SimulationSnapshot) {
    const width = this.scale.width
    const height = this.scale.height
    const ratio = Phaser.Math.Clamp(snapshot.progressM / 100, 0, 1)
    const depth = Math.pow(ratio, 0.82)
    const portrait = this.isPortrait()
    // Follow the road's perspective all the way into the open gate. Both the
    // shrinking scale and rising ground line make the destination unambiguous.
    const horseX = portrait
      ? Phaser.Math.Linear(width * 0.3, width * 0.43, depth)
      : Phaser.Math.Linear(width * 0.19, width * 0.69, depth)
    const horseY = portrait
      ? Phaser.Math.Linear(height * 0.79, height * 0.54, depth)
      : Phaser.Math.Linear(height * 0.79, height * 0.55, depth)
    const baseHorseScale = portrait ? width / 1_350 : Math.min(width / 2_750, height / 1_720)
    const perspectiveScale = Phaser.Math.Linear(portrait ? 1.02 : 1.04, portrait ? 0.58 : 0.62, depth)
    const horseScale = baseHorseScale * perspectiveScale
    const pullerScale = horseScale * (portrait ? 0.72 : 0.7)
    const routeAngle = Phaser.Math.Linear(portrait ? -8 : -7, portrait ? -4 : -3, depth)
    const motionAllowed = !this.options.settings.reducedMotion
    const roughBob = motionAllowed ? Math.sin(this.time.now * 0.021) * snapshot.terrainRoughness * 2.8 : 0
    const pullBob = motionAllowed && snapshot.velocity > 0.08
      ? Math.abs(Math.sin(this.time.now * 0.013)) * snapshot.pullEffort * (portrait ? 2.6 : 4.2)
      : 0

    const source = this.background.texture.getSourceImage() as HTMLImageElement
    const coverScale = Math.max(width / source.width, height / source.height) * (1.015 + ratio * 0.006)
    this.background
      .setScale(coverScale)
      .setPosition(width / 2, height / 2)
    const actShade = snapshot.act === "gate" ? 0.16 : snapshot.act === "inspection" ? 0.11 : 0.075
    this.shade.setFillStyle(snapshot.inspection.phase === "active" ? 0x3a1711 : 0x171310, snapshot.inspection.phase === "active" ? 0.22 : actShade)

    const visualAngle = routeAngle + snapshot.pitch
    this.horse.setPosition(horseX, horseY + roughBob).setScale(horseScale).setAngle(visualAngle)
    this.truthHorse.setPosition(this.horse.x, this.horse.y).setScale(horseScale).setAngle(visualAngle)

    const pullerOffsetX = portrait
      ? Phaser.Math.Linear(width * 0.3, width * 0.19, depth)
      : Phaser.Math.Linear(width * 0.315, width * 0.2, depth)
    const pullerOffsetY = portrait
      ? Phaser.Math.Linear(-height * 0.055, -height * 0.035, depth)
      : Phaser.Math.Linear(-height * 0.045, -height * 0.025, depth)
    const pullerCenterX = horseX + pullerOffsetX
    const pullerCenterY = horseY + pullerOffsetY
    const stride = motionAllowed && snapshot.velocity > 0.08 ? Math.sin(this.time.now * 0.013) * Math.min(5, snapshot.velocity * 3.4) : 0
    this.pullTeam
      .setPosition(pullerCenterX + stride, pullerCenterY + pullBob)
      .setScale(pullerScale)
      .setAngle(routeAngle * 0.85 + snapshot.pitch * 0.04 - snapshot.pullEffort * 0.7)
      .setAlpha(snapshot.inspection.phase === "active" ? 0.92 : 1)

    this.drawRope(horseX, horseY, horseScale, pullerCenterX, pullerCenterY, pullerScale, snapshot)
    this.placeWheels(horseX, horseY + roughBob, horseScale, visualAngle, snapshot.progressM)
    this.updateInspection(horseX, horseY, horseScale, snapshot)
    this.drawDust(horseX, horseY, horseScale, snapshot.velocity, snapshot.terrainRoughness)
    this.drawBalanceGlyph(width, height, snapshot.balance, snapshot.pitch)
  }

  private drawRope(
    horseX: number,
    horseY: number,
    horseScale: number,
    pullerX: number,
    pullerY: number,
    pullerScale: number,
    snapshot: SimulationSnapshot,
  ) {
    this.rope.clear()
    const startX = horseX + 390 * horseScale
    const startY = horseY - 185 * horseScale
    const endX = pullerX - 530 * pullerScale
    const endY = pullerY - 315 * pullerScale
    const tension = Phaser.Math.Clamp(snapshot.tension, 0, 1)
    const color = tension >= 0.84 ? 0xe35c38 : tension >= 0.68 ? 0xd6ae70 : 0x704329
    this.rope.lineStyle(Math.max(2, 7 * horseScale), color, 0.98)
    const sag = (1 - snapshot.pullEffort) * 24 + (1 - tension) * 18
    let previousX = startX
    let previousY = startY
    for (let index = 1; index <= 18; index += 1) {
      const t = index / 18
      const nextX = Phaser.Math.Linear(startX, endX, t)
      const nextY = Phaser.Math.Linear(startY, endY, t) + Math.sin(Math.PI * t) * sag
      this.rope.lineBetween(previousX, previousY, nextX, nextY)
      previousX = nextX
      previousY = nextY
    }
  }

  private placeWheels(horseX: number, horseY: number, scale: number, pitch: number, progressM: number) {
    const angle = Phaser.Math.DegToRad(pitch)
    const place = (wheel: Phaser.GameObjects.Graphics, localX: number) => {
      const x = localX * scale
      const y = -8 * scale
      wheel.setPosition(horseX + x * Math.cos(angle) - y * Math.sin(angle), horseY + x * Math.sin(angle) + y * Math.cos(angle))
      wheel.setScale(scale).setRotation(angle - progressM * 0.42)
    }
    place(this.wheelRear, -88)
    place(this.wheelFront, 380)
  }

  private updateInspection(horseX: number, horseY: number, horseScale: number, snapshot: SimulationSnapshot) {
    const width = this.scale.width
    const height = this.scale.height
    const portrait = this.isPortrait()
    this.inspectionCone.clear()
    if (snapshot.inspection.phase === "idle") {
      this.truthHorse.setVisible(false)
      this.horse.clearTint()
      return
    }

    const active = snapshot.inspection.phase === "active"
    const guardX = portrait ? width * 0.54 : width * 0.885
    const guardY = portrait ? height * 0.44 : height * 0.405
    const pulse = 0.82 + Math.sin(this.time.now * 0.012) * 0.18
    const signalRadius = portrait ? Math.max(9, width * 0.024) : Math.max(8, width * 0.008)

    this.inspectionCone.fillStyle(0xf0a34f, (active ? 0.22 : 0.34) * pulse)
    this.inspectionCone.fillCircle(guardX, guardY, signalRadius * (active ? 1.55 : 1.15))
    this.inspectionCone.fillStyle(0xffd28a, (active ? 0.72 : 0.94) * pulse)
    this.inspectionCone.fillCircle(guardX, guardY, signalRadius * 0.42)
    this.inspectionCone.lineStyle(Math.max(1.5, signalRadius * 0.18), 0xd6ae70, 0.7)
    for (let ray = 0; ray < 8; ray += 1) {
      const angle = (Math.PI * 2 * ray) / 8
      this.inspectionCone.lineBetween(
        guardX + Math.cos(angle) * signalRadius * 0.72,
        guardY + Math.sin(angle) * signalRadius * 0.72,
        guardX + Math.cos(angle) * signalRadius * 1.35,
        guardY + Math.sin(angle) * signalRadius * 1.35,
      )
    }

    const sweepProgress = active ? Phaser.Math.Clamp(snapshot.inspection.progress / 0.38, 0, 1) : snapshot.inspection.progress
    this.inspectionCone.fillStyle(active ? 0xb6452e : 0xa87432, active ? 0.2 + sweepProgress * 0.09 : 0.06 + snapshot.inspection.progress * 0.11)
    this.inspectionCone.beginPath()
    this.inspectionCone.moveTo(guardX, guardY)
    this.inspectionCone.lineTo(horseX - width * (active ? 0.11 : 0.03), horseY - height * 0.18)
    this.inspectionCone.lineTo(horseX + width * (active ? 0.15 : 0.04), horseY + height * 0.07)
    this.inspectionCone.closePath()
    this.inspectionCone.fillPath()

    if (active) {
      this.horse.setTint(0xd77b5d)
      const sweep = Phaser.Math.Clamp(snapshot.inspection.progress / 0.34, 0, 1)
      if (!this.options.settings.reducedMotion && snapshot.inspection.progress <= 0.38) {
        const source = this.truthHorse.texture.getSourceImage() as HTMLImageElement
        this.truthHorse.setVisible(true).setAlpha(0.84 - sweep * 0.25).setCrop(0, 0, source.width * sweep, source.height)
      } else {
        this.truthHorse.setVisible(false)
      }
    } else {
      this.horse.clearTint()
      this.truthHorse.setVisible(false)
    }
  }

  private drawDust(x: number, y: number, scale: number, speed: number, roughness: number) {
    this.dust.clear()
    if (this.options.settings.reducedMotion || speed < 0.12) return
    this.dust.fillStyle(0xc99462, Math.min(0.32, speed * 0.14 + roughness * 0.07))
    for (let index = 0; index < 9; index += 1) {
      const offset = (this.time.now * (0.018 + speed * 0.006) + index * 47) % 130
      this.dust.fillCircle(x - 60 * scale - offset, y + 4 + index * 3, 2.5 + (index % 3) * 1.8)
    }
  }

  private drawBalanceGlyph(width: number, height: number, balance: number, pitch: number) {
    this.balanceGlyph.clear()
    const portrait = this.isPortrait()
    const railWidth = portrait ? width * 0.86 : Math.min(width * 0.42, 480)
    const y = height - (portrait ? Math.max(88, height * 0.105) : Math.max(34, height * 0.038))
    const x = width / 2 - railWidth / 2
    this.balanceGlyph.fillStyle(0x171310, 0.5)
    this.balanceGlyph.fillRoundedRect(x - 12, y - 18, railWidth + 24, 36, 18)
    this.balanceGlyph.lineStyle(2, 0xf1dfc0, 0.58)
    this.balanceGlyph.lineBetween(x, y, x + railWidth, y)
    this.balanceGlyph.lineStyle(1, 0xf1dfc0, 0.36)
    this.balanceGlyph.lineBetween(width / 2, y - 8, width / 2, y + 8)
    this.balanceGlyph.fillStyle(Math.abs(pitch) > 18 ? 0xe45f3d : 0x4caaaa, 1)
    this.balanceGlyph.fillCircle(x + ((balance + 1) / 2) * railWidth, y, 8)
  }

  private queueFinish() {
    if (this.finishQueued) return
    const result = this.simulation.result()
    if (!result) return
    this.finishQueued = true
    this.pendingResult = result
    this.releaseControl()
    if (!this.options.settings.reducedMotion && result.outcome !== "success") this.cameras.main.shake(260, 0.012)
    this.finishTimer = window.setTimeout(() => this.completeFinish(), this.options.settings.reducedMotion ? 300 : 1_150)
  }

  private completeFinish() {
    if (!this.finishQueued || !this.pendingResult) return
    const result = this.pendingResult
    this.cancelFinish()
    this.options.callbacks.onFinish(result)
  }

  private cancelFinish() {
    if (this.finishTimer !== undefined) window.clearTimeout(this.finishTimer)
    this.finishTimer = undefined
    this.pendingResult = undefined
    this.finishQueued = false
  }

  private completeFromTest(outcome: RunOutcome) {
    this.previousSnapshot = this.currentSnapshot
    this.currentSnapshot = this.simulation.forceFinish(outcome)
    this.updateVisuals(this.currentSnapshot)
    this.options.callbacks.onSnapshot(this.currentSnapshot)
    this.queueFinish()
  }

  releaseControl() {
    if (this.control.brace) this.options.callbacks.onRelease()
    this.control.brace = false
    this.control.keyboardBalanceDirection = 0
  }

  restartRun() {
    this.cancelFinish()
    this.resetRunState()
    if (this.testBridge) {
      this.testBridge.instanceId = crypto.randomUUID()
      this.testBridge.lastRestartMs = performance.now()
    }
    this.updateVisuals(this.currentSnapshot)
    this.options.callbacks.onSnapshot(this.currentSnapshot)
  }

  private resetRunState() {
    this.cancelFinish()
    this.control = { brace: false, balance: 0, pointerOriginX: 0, pointerStartBalance: 0, keyboardBalanceDirection: 0 }
    this.accumulator = 0
    this.lastSnapshotEmit = 0
    this.lastInspectionPhase = "idle"
    this.lastBrace = false
    this.tensionCritical = false
    this.simulation = new RunSimulation(this.options.runConfig)
    this.previousSnapshot = this.simulation.snapshot()
    this.currentSnapshot = this.previousSnapshot
  }

  private layout() {
    if (!this.background || !this.shade) return
    const width = this.scale.width
    const height = this.scale.height
    const desiredKey = this.isPortrait() ? "road-portrait" : "road-desktop"
    if (this.background.texture.key !== desiredKey) this.background.setTexture(desiredKey)
    this.shade.setSize(width, height)
    if (this.currentSnapshot) this.updateVisuals(this.currentSnapshot)
  }

  private isPortrait() {
    return this.scale.height > this.scale.width * 1.08
  }

  private isLocalTestMode() {
    return ["127.0.0.1", "localhost"].includes(window.location.hostname) && new URLSearchParams(window.location.search).has("test")
  }
}

export function createTroyGame(options: RuntimeOptions) {
  const scene = new TroyScene(options)
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: options.parent,
    backgroundColor: "#171310",
    transparent: false,
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: options.parent.clientWidth,
      height: options.parent.clientHeight,
    },
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: false,
      powerPreference: "high-performance",
    },
    audio: { noAudio: true },
    scene,
  })
  let externallyPaused = false
  let playerPaused = false

  const applyPause = () => {
    const activeScene = game.scene.getScene("troy") as TroyScene | undefined
    if (!activeScene) return
    const paused = document.hidden || externallyPaused || playerPaused
    if (paused) activeScene.releaseControl()
    if (paused && !game.scene.isPaused("troy")) game.scene.pause("troy")
    if (!paused && game.scene.isPaused("troy")) game.scene.resume("troy")
  }
  const setPlayerPaused = (paused: boolean) => {
    if (playerPaused === paused) return
    playerPaused = paused
    options.callbacks.onPauseChange(paused)
    applyPause()
  }
  const setPaused = (paused: boolean) => {
    externallyPaused = paused
    applyPause()
  }
  const onPauseKey = (event: KeyboardEvent) => {
    if (event.code !== "Escape" && event.code !== "KeyP") return
    if (externallyPaused) return
    event.preventDefault()
    setPlayerPaused(!playerPaused)
  }
  const onVisibility = () => applyPause()
  window.addEventListener("keydown", onPauseKey)
  document.addEventListener("visibilitychange", onVisibility)

  return {
    setPaused,
    setPlayerPaused,
    setSettings(settings: AccessibilitySettings) {
      options.settings = settings
    },
    restart() {
      if (playerPaused) {
        playerPaused = false
        options.callbacks.onPauseChange(false)
      }
      const activeScene = game.scene.getScene("troy") as TroyScene | undefined
      activeScene?.restartRun()
      applyPause()
    },
    destroy() {
      window.removeEventListener("keydown", onPauseKey)
      document.removeEventListener("visibilitychange", onVisibility)
      game.destroy(true)
    },
  }
}
