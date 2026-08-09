import type { SimulationSnapshot } from "../types"

type AudioIntensity = "idle" | "pull" | "suspicion" | "alarm"
type SoundEffect = "inspect" | "impact" | "success" | "fail" | "brace" | "release" | "rope"

const TEMPO = 92
const SIXTEENTH_MS = 60_000 / TEMPO / 4

export class AudioDirector {
  private context?: AudioContext
  private master?: GainNode
  private music?: GainNode
  private effects?: GainNode
  private ambience?: GainNode
  private rumbleSource?: AudioBufferSourceNode
  private rumbleGain?: GainNode
  private rumbleFilter?: BiquadFilterNode
  private droneGain?: GainNode
  private droneOscillators: OscillatorNode[] = []
  private intensity: AudioIntensity = "idle"
  private timer?: number
  private beat = 0
  private movement = 0
  private tension = 0
  private suspicion = 0
  private muted = false
  private paused = false

  async start(muted: boolean) {
    this.muted = muted
    // start() is called directly from the player's title-screen click. Always
    // unlock audio here while the browser still considers it a user gesture.
    this.paused = false
    if (!this.context) this.createAudioGraph()
    if (!muted && this.context?.state === "suspended") {
      await this.context.resume().catch(() => undefined)
    }
    this.updateContinuousMix()
  }

  private createAudioGraph() {
    this.context = new AudioContext()
    this.master = this.context.createGain()
    this.music = this.context.createGain()
    this.effects = this.context.createGain()
    this.ambience = this.context.createGain()
    const compressor = this.context.createDynamicsCompressor()

    this.master.gain.value = this.muted ? 0 : 0.38
    this.music.gain.value = 0.82
    this.effects.gain.value = 1
    this.ambience.gain.value = 0.78
    compressor.threshold.value = -18
    compressor.knee.value = 12
    compressor.ratio.value = 4
    compressor.attack.value = 0.004
    compressor.release.value = 0.24

    this.music.connect(this.master)
    this.effects.connect(this.master)
    this.ambience.connect(this.master)
    this.master.connect(compressor).connect(this.context.destination)
    this.createRumbleBed()
    this.createDroneBed()
    this.timer = window.setInterval(() => this.pulse(), SIXTEENTH_MS)
  }

  private createRumbleBed() {
    if (!this.context || !this.ambience) return
    const length = this.context.sampleRate * 2
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate)
    const data = buffer.getChannelData(0)
    let brown = 0
    for (let index = 0; index < length; index += 1) {
      brown = brown * 0.965 + (Math.random() * 2 - 1) * 0.035
      data[index] = brown * 2.1
    }
    this.rumbleSource = this.context.createBufferSource()
    this.rumbleFilter = this.context.createBiquadFilter()
    this.rumbleGain = this.context.createGain()
    this.rumbleSource.buffer = buffer
    this.rumbleSource.loop = true
    this.rumbleFilter.type = "lowpass"
    this.rumbleFilter.frequency.value = 190
    this.rumbleFilter.Q.value = 0.8
    this.rumbleGain.gain.value = 0
    this.rumbleSource.connect(this.rumbleFilter).connect(this.rumbleGain).connect(this.ambience)
    this.rumbleSource.start()
  }

  private createDroneBed() {
    if (!this.context || !this.ambience) return
    const filter = this.context.createBiquadFilter()
    this.droneGain = this.context.createGain()
    filter.type = "lowpass"
    filter.frequency.value = 360
    filter.Q.value = 0.65
    this.droneGain.gain.value = 0
    this.droneGain.connect(filter).connect(this.ambience)

    ;[
      { frequency: 55, type: "sine" as OscillatorType, gain: 0.72 },
      { frequency: 82.41, type: "triangle" as OscillatorType, gain: 0.28 },
    ].forEach((voice) => {
      const oscillator = this.context!.createOscillator()
      const voiceGain = this.context!.createGain()
      oscillator.type = voice.type
      oscillator.frequency.value = voice.frequency
      voiceGain.gain.value = voice.gain
      oscillator.connect(voiceGain).connect(this.droneGain!)
      oscillator.start()
      this.droneOscillators.push(oscillator)
    })
  }

  setMuted(muted: boolean) {
    this.muted = muted
    if (!this.master || !this.context) return
    this.master.gain.cancelScheduledValues(this.context.currentTime)
    this.master.gain.setTargetAtTime(muted ? 0 : 0.38, this.context.currentTime, 0.035)
    if (!muted && !this.paused && this.context.state === "suspended") void this.context.resume().catch(() => undefined)
  }

  setPaused(paused: boolean) {
    this.paused = paused
    if (!this.context) return
    if (paused && this.context.state === "running") void this.context.suspend()
    if (!paused && !this.muted && this.context.state === "suspended") void this.context.resume().catch(() => undefined)
  }

  setIntensity(intensity: AudioIntensity) {
    if (this.intensity === intensity) return
    this.intensity = intensity
    this.updateContinuousMix()
  }

  updateGameplay(snapshot: SimulationSnapshot) {
    this.movement = Math.max(0, Math.min(1, snapshot.velocity / 1.8))
    this.tension = Math.max(0, Math.min(1, snapshot.tension))
    this.suspicion = Math.max(0, Math.min(1, snapshot.suspicionPct / 100))
    this.setIntensity(
      snapshot.inspection.phase === "active"
        ? "alarm"
        : snapshot.inspection.phase === "telegraph"
          ? "suspicion"
          : snapshot.velocity > 0.15
            ? "pull"
            : "idle",
    )
    this.updateContinuousMix()
  }

  private updateContinuousMix() {
    if (!this.context) return
    const now = this.context.currentTime
    const droneLevels: Record<AudioIntensity, number> = {
      idle: 0,
      pull: 0.024,
      suspicion: 0.04,
      alarm: 0.057,
    }
    const rumble = this.intensity === "idle" ? 0 : 0.018 + this.movement * 0.055 + this.tension * 0.018
    this.rumbleGain?.gain.setTargetAtTime(rumble, now, 0.12)
    this.rumbleFilter?.frequency.setTargetAtTime(150 + this.movement * 180 + this.tension * 90, now, 0.12)
    this.droneGain?.gain.setTargetAtTime(droneLevels[this.intensity] * (1 + this.suspicion * 0.3), now, 0.18)
  }

  sfx(kind: SoundEffect) {
    if (!this.context || !this.effects || this.context.state !== "running") return
    if (kind === "rope") {
      this.ropeCreak()
      return
    }
    if (kind === "brace") {
      this.knock(58, 0.18, 0.14, this.effects)
      this.woodClack(0.12, this.effects)
      return
    }
    if (kind === "release") {
      this.toneSweep(116, 74, 0.07, 0.19, "triangle")
      this.woodClack(0.045, this.effects)
      return
    }
    if (kind === "inspect") {
      this.toneSweep(520, 285, 0.14, 0.3, "square")
      this.bronzeTap(0.09, 0.08, this.effects)
      this.bronzeTap(0.055, 0.22, this.effects, 466.16)
      return
    }
    if (kind === "success") {
      ;[146.83, 220, 293.66, 369.99].forEach((frequency, index) => this.pluck(frequency, 0.18, 0.52, index * 0.11, this.effects))
      this.bronzeTap(0.11, 0.42, this.effects, 440)
      return
    }
    if (kind === "fail") {
      this.toneSweep(122, 42, 0.19, 0.62, "sawtooth")
      this.knock(48, 0.22, 0.28, this.effects)
      this.woodClack(0.1, this.effects)
      return
    }
    this.knock(76, 0.18, 0.2, this.effects)
    this.woodClack(0.08, this.effects)
  }

  private pulse() {
    if (!this.context || !this.music || this.context.state !== "running" || this.intensity === "idle") return
    const step = this.beat % 16
    this.beat += 1
    const drive = 0.8 + this.movement * 0.35

    if (this.intensity === "pull") {
      if (step === 0 || step === 8) this.knock(56, 0.15 * drive, 0.16, this.music)
      if (step === 4 || step === 12) this.knock(72, 0.085 * drive, 0.1, this.music)
      if ([2, 6, 10, 14].includes(step)) this.woodClack(0.052, this.music)
      const notes: Record<number, number> = { 0: 146.83, 6: 110, 10: 130.81, 14: 174.61 }
      if (notes[step]) this.pluck(notes[step], 0.042, 0.26, 0, this.music)
      return
    }

    if (this.intensity === "suspicion") {
      if (step === 0 || step === 8) this.knock(58, 0.16, 0.18, this.music)
      if (step === 4 || step === 12) this.woodClack(0.06, this.music)
      if (step === 6 || step === 14) this.bronzeTap(0.055)
      if (step === 0 || step === 10) this.pluck(step === 0 ? 155.56 : 164.81, 0.055, 0.34, 0, this.music)
      return
    }

    if (step % 4 === 0) this.knock(step === 0 || step === 8 ? 62 : 78, 0.19, 0.16, this.music)
    if (step % 4 === 2) this.bronzeTap(0.075)
    if (step % 2 === 1) this.woodClack(0.052, this.music)
    if (step % 4 === 0) this.pluck([220, 233.08, 196, 246.94][step / 4], 0.064, 0.24, 0, this.music)
  }

  private knock(frequency: number, volume: number, duration: number, destination = this.effects) {
    if (!this.context || !destination || this.context.state !== "running") return
    const now = this.context.currentTime
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    oscillator.type = "triangle"
    oscillator.frequency.setValueAtTime(frequency, now)
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(38, frequency * 0.48), now + duration)
    gain.gain.setValueAtTime(volume, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    oscillator.connect(gain).connect(destination)
    oscillator.start(now)
    oscillator.stop(now + duration)
  }

  private woodClack(volume: number, destination = this.effects) {
    if (!this.context || !destination || this.context.state !== "running") return
    const length = Math.floor(this.context.sampleRate * 0.05)
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let index = 0; index < length; index += 1) data[index] = (Math.random() * 2 - 1) * Math.exp(-index / (length * 0.1))
    const source = this.context.createBufferSource()
    const filter = this.context.createBiquadFilter()
    const gain = this.context.createGain()
    filter.type = "bandpass"
    filter.frequency.value = 680 + Math.random() * 180
    filter.Q.value = 2.5
    gain.gain.value = volume
    source.buffer = buffer
    source.connect(filter).connect(gain).connect(destination)
    source.start()
  }

  private bronzeTap(volume = 0.06, delay = 0, destination = this.music, fundamental = 392) {
    if (!this.context || !destination || this.context.state !== "running") return
    const now = this.context.currentTime + delay
    ;[1, 2.62].forEach((multiple, index) => {
      const oscillator = this.context!.createOscillator()
      const gain = this.context!.createGain()
      oscillator.type = "sine"
      oscillator.frequency.value = fundamental * multiple
      gain.gain.setValueAtTime(volume / (index + 1), now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38)
      oscillator.connect(gain).connect(destination)
      oscillator.start(now)
      oscillator.stop(now + 0.4)
    })
  }

  private pluck(frequency: number, volume: number, duration: number, delay = 0, destination = this.music) {
    if (!this.context || !destination || this.context.state !== "running") return
    const now = this.context.currentTime + delay
    const oscillator = this.context.createOscillator()
    const filter = this.context.createBiquadFilter()
    const gain = this.context.createGain()
    oscillator.type = "triangle"
    oscillator.frequency.setValueAtTime(frequency, now)
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.995, now + duration)
    filter.type = "lowpass"
    filter.frequency.setValueAtTime(1_450, now)
    filter.frequency.exponentialRampToValueAtTime(320, now + duration)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    oscillator.connect(filter).connect(gain).connect(destination)
    oscillator.start(now)
    oscillator.stop(now + duration + 0.02)
  }

  private toneSweep(start: number, end: number, volume: number, duration: number, type: OscillatorType) {
    if (!this.context || !this.effects || this.context.state !== "running") return
    const now = this.context.currentTime
    const oscillator = this.context.createOscillator()
    const filter = this.context.createBiquadFilter()
    const gain = this.context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(start, now)
    oscillator.frequency.exponentialRampToValueAtTime(end, now + duration)
    filter.type = "lowpass"
    filter.frequency.value = 780
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    oscillator.connect(filter).connect(gain).connect(this.effects)
    oscillator.start(now)
    oscillator.stop(now + duration + 0.02)
  }

  private ropeCreak() {
    if (!this.context || !this.effects || this.context.state !== "running") return
    const now = this.context.currentTime
    const oscillator = this.context.createOscillator()
    const filter = this.context.createBiquadFilter()
    const gain = this.context.createGain()
    oscillator.type = "sawtooth"
    oscillator.frequency.setValueAtTime(88, now)
    oscillator.frequency.linearRampToValueAtTime(148, now + 0.32)
    filter.type = "lowpass"
    filter.frequency.value = 440
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.11, now + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34)
    oscillator.connect(filter).connect(gain).connect(this.effects)
    oscillator.start(now)
    oscillator.stop(now + 0.36)
  }

  destroy() {
    if (this.timer) window.clearInterval(this.timer)
    this.droneOscillators.forEach((oscillator) => oscillator.stop())
    this.rumbleSource?.stop()
    void this.context?.close()
  }
}
