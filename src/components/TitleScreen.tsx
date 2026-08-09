import type { RunConfig } from "../types"
import { trackGameEvent } from "../game/analytics"
import { BrandMark } from "./BrandMark"
import { GameButton } from "./GameButton"
import { SettingsIcon, SoundIcon } from "./GameIcons"

interface TitleScreenProps {
  config: RunConfig
  soundOn: boolean
  invalidChallenge: boolean
  onBegin(): void
  onPractice(): void
  onSoundToggle(): void
  onSettings(): void
}

function utcDateLabel() {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date())
    .toUpperCase()
}

export function TitleScreen(props: TitleScreenProps) {
  const isDuel = props.config.mode === "duel"
  return (
    <main className="title-screen">
      <picture className="scene-background" aria-hidden="true">
        <source media="(orientation: portrait)" srcSet="/assets/art/troy-road-portrait-crowd.webp" />
        <img src="/assets/art/troy-road-desktop-crowd.webp" alt="" />
      </picture>
      <div className="scene-vignette" aria-hidden="true" />
      <img className="title-horse" src="/assets/art/horse.webp" alt="A giant wooden horse on wheels" />
      <img className="title-pullers" src="/assets/art/pullers.webp" alt="Four Trojan soldiers pulling ropes" />
      <section className="title-copy">
        <BrandMark />
        <p className="title-tagline">A completely ordinary delivery.</p>
        {props.invalidChallenge ? <p className="challenge-warning">That ancient message was damaged. Today’s siege is ready instead.</p> : null}
        {isDuel ? (
          <p className="duel-target">BEAT {props.config.targetScore?.toLocaleString()} <span>· SAME SIEGE</span></p>
        ) : null}
        <GameButton variant="primary" className="begin-button" onClick={props.onBegin}>
          {isDuel ? "ACCEPT THE CHALLENGE" : "BEGIN THE INFILTRATION"}
        </GameButton>
        <p className="title-instruction"><strong>The Trojans pull automatically.</strong> Hold <kbd>Space</kbd> or press to brace the hidden crew. Slide or use <kbd>A</kbd> / <kbd>D</kbd> to counterbalance.</p>
        <p className="title-credit-mobile">
          <span>Built by Ayush</span>
          <span aria-hidden="true">·</span>
          <a href="https://github.com/ayushhagarwal/troy-hard" target="_blank" rel="noopener noreferrer" onClick={() => trackGameEvent("creator_click", { surface: "title_mobile_github" })}>GitHub</a>
        </p>
      </section>
      <nav className="title-utilities" aria-label="Game options">
        <GameButton variant="quiet" onClick={props.onSoundToggle}><SoundIcon />{props.soundOn ? "SOUND ON" : "SOUND OFF"}</GameButton>
        <GameButton variant="quiet" onClick={props.onSettings}><SettingsIcon />ACCESSIBILITY</GameButton>
        <span className="daily-label">{isDuel ? "FRIEND'S SIEGE" : `TODAY'S SIEGE  ·  ${utcDateLabel()}`}</span>
        <GameButton variant="quiet" onClick={props.onPractice}>PRACTICE</GameButton>
        <span>Built by Ayush</span>
        <a href="https://github.com/ayushhagarwal/troy-hard" target="_blank" rel="noopener noreferrer" onClick={() => trackGameEvent("creator_click", { surface: "title_github" })}>GitHub</a>
      </nav>
    </main>
  )
}
