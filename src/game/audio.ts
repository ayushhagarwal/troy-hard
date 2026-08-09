type AudioIntensity = "idle" | "pull" | "suspicion" | "alarm"
type SoundEffect = "inspect" | "impact" | "success" | "fail" | "brace" | "rope"

export class AudioDirector {
  private context?: AudioContext
  private master?: GainNode
  private music?: GainNode
  private effects?: GainNode
  private intensity: AudioIntensity = "idle"
  private timer?: number
  private beat = 0
  private muted = false
  private paused = false

  async start(muted: boolean) {
    this.muted = muted
    if (!this.context) {
      this.context = new AudioContext()
      this.master = this.context.createGain()
      this.music = this.context.createGain()
      this.effects = this.context.createGain()
      this.master.gain.value = muted ? 0 : 0.26
      this.music.gain.value = 0.72
      this.effects.gain.value = 1
      this.music.connect(this.master)
      this.effects.connect(this.master)
      this.master.connect(this.context.destination)
      this.timer = window.setInterval(() => this.pulse(), 60_000 / 92 / 4)
    }
    if (!this.paused && this.context.state === "suspended") await this.context.resume()
  }

  setMuted(muted: boolean) {
    this.muted = muted
    if (!this.master || !this.context) return
    this.master.gain.cancelScheduledValues(this.context.currentTime)
    this.master.gain.setTargetAtTime(muted ? 0 : 0.26, this.context.currentTime, 0.04)
    if (!muted && !this.paused && this.context.state === "suspended") void this.context.resume().catch(() => undefined)
  }

  setPaused(paused: boolean) {
    this.paused = paused
    if (!this.context) return
    if (paused && this.context.state === "running") void this.context.suspend()
    if (!paused && !this.muted && this.context.state === "suspended") void this.context.resume().catch(() => undefined)
  }

  setIntensity(intensity: AudioIntensity) {
    this.intensity = intensity
  }

  heave() {
    this.knock(88, 0.045, 0.1, this.effects)
    this.woodClack(0.034)
  }

  sfx(kind: SoundEffect) {
    if (!this.context || !this.effects || this.context.state !== "running") return
    if (kind === "rope") {
      this.ropeCreak()
      return
    }
    if (kind === "brace") {
      this.knock(54, 0.075, 0.16, this.effects)
      this.woodClack(0.055)
      return
    }
    const now = this.context.currentTime
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    oscillator.type = kind === "success" ? "triangle" : kind === "inspect" ? "square" : "sawtooth"
    const start = kind === "inspect" ? 510 : kind === "success" ? 164 : kind === "impact" ? 82 : 72
    oscillator.frequency.setValueAtTime(start, now)
    oscillator.frequency.exponentialRampToValueAtTime(kind === "success" ? 246 : Math.max(40, start * 0.58), now + 0.28)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(kind === "success" ? 0.24 : 0.13, now + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34)
    oscillator.connect(gain).connect(this.effects)
    oscillator.start(now)
    oscillator.stop(now + 0.36)
    if (kind === "inspect") window.setTimeout(() => this.bronzeTap(), 105)
  }

  private pulse() {
    if (!this.context || !this.music || this.context.state !== "running") return
    this.beat += 1
    const quarter = this.beat % 4 === 0
    const downbeat = this.beat % 16 === 0
    if (this.intensity === "idle" && !downbeat) return
    if (quarter) {
      const frequency = this.intensity === "alarm" ? 112 : this.intensity === "suspicion" ? 86 : 64
      const volume = this.intensity === "alarm" ? 0.1 : this.intensity === "suspicion" ? 0.073 : 0.046
      this.knock(frequency, volume, downbeat ? 0.15 : 0.09, this.music)
    }
    if (this.intensity === "pull" && this.beat % 8 === 6) this.woodClack(0.026, this.music)
    if (this.intensity === "suspicion" && this.beat % 4 === 2) this.bronzeTap(0.035)
    if (this.intensity === "alarm") {
      if (this.beat % 2 === 0) this.bronzeTap(0.052)
      if (this.beat % 8 === 5) this.woodClack(0.04, this.music)
    }
  }

  private knock(frequency: number, volume: number, duration: number, destination = this.effects) {
    if (!this.context || !destination || this.context.state !== "running") return
    const now = this.context.currentTime
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    oscillator.type = "triangle"
    oscillator.frequency.setValueAtTime(frequency, now)
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(38, frequency * 0.55), now + duration)
    gain.gain.setValueAtTime(volume, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    oscillator.connect(gain).connect(destination)
    oscillator.start(now)
    oscillator.stop(now + duration)
  }

  private woodClack(volume: number, destination = this.effects) {
    if (!this.context || !destination || this.context.state !== "running") return
    const length = Math.floor(this.context.sampleRate * 0.035)
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let index = 0; index < length; index += 1) data[index] = (Math.random() * 2 - 1) * Math.exp(-index / (length * 0.12))
    const source = this.context.createBufferSource()
    const filter = this.context.createBiquadFilter()
    const gain = this.context.createGain()
    filter.type = "bandpass"
    filter.frequency.value = 760
    filter.Q.value = 2.3
    gain.gain.value = volume
    source.buffer = buffer
    source.connect(filter).connect(gain).connect(destination)
    source.start()
  }

  private bronzeTap(volume = 0.045) {
    if (!this.context || !this.music || this.context.state !== "running") return
    const now = this.context.currentTime
    ;[1, 2.62].forEach((multiple, index) => {
      const oscillator = this.context!.createOscillator()
      const gain = this.context!.createGain()
      oscillator.type = "sine"
      oscillator.frequency.value = 392 * multiple
      gain.gain.setValueAtTime(volume / (index + 1), now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28)
      oscillator.connect(gain).connect(this.music!)
      oscillator.start(now)
      oscillator.stop(now + 0.3)
    })
  }

  private ropeCreak() {
    if (!this.context || !this.effects || this.context.state !== "running") return
    const now = this.context.currentTime
    const oscillator = this.context.createOscillator()
    const filter = this.context.createBiquadFilter()
    const gain = this.context.createGain()
    oscillator.type = "sawtooth"
    oscillator.frequency.setValueAtTime(96, now)
    oscillator.frequency.linearRampToValueAtTime(142, now + 0.23)
    filter.type = "lowpass"
    filter.frequency.value = 410
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.065, now + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.27)
    oscillator.connect(filter).connect(gain).connect(this.effects)
    oscillator.start(now)
    oscillator.stop(now + 0.28)
  }

  destroy() {
    if (this.timer) window.clearInterval(this.timer)
    void this.context?.close()
  }
}
