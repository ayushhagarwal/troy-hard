import { useState } from "react"
import { BrandMark } from "./BrandMark"
import { GameButton } from "./GameButton"
import { trackGameEvent } from "../game/analytics"
import { clearProfile } from "../game/storage"

interface InfoPageProps {
  kind: "making-of" | "credits"
}

const PROCESS_IMAGES = [
  { src: "/assets/making-of/title-concept.webp", alt: "Approved TROY HARD title-screen concept", caption: "Attract screen — make the joke readable before explaining the rules." },
  { src: "/assets/making-of/gameplay-concept.webp", alt: "Approved desktop gameplay concept", caption: "Desktop gameplay — a low three-quarter camera keeps pullers, horse, and gate in one readable line." },
  { src: "/assets/making-of/portrait-concept.webp", alt: "Approved portrait gameplay concept", caption: "Portrait gameplay — composed independently, with a full-width balance rail instead of a desktop crop." },
  { src: "/assets/making-of/results-concept.webp", alt: "Approved TROY HARD success concept", caption: "Results — the run becomes a poster people can share without being forced to share it." },
]

export function InfoPage({ kind }: InfoPageProps) {
  const makingOf = kind === "making-of"
  const [dataCleared, setDataCleared] = useState(false)
  return (
    <main className="info-page">
      <header className="info-header">
        <a href="/" aria-label="Play Troy Hard"><BrandMark compact /></a>
        <a className="play-link" href="/">PLAY THE GAME →</a>
      </header>
      <article>
        <p className="section-label">{makingOf ? "THE MAKING OF TROY HARD" : "CREDITS & PRIVACY"}</p>
        <h1>{makingOf ? "A physics heist inside a wooden horse." : "Built independently. Stored locally."}</h1>
        <p className="info-lead">
          {makingOf
            ? "TROY HARD turns one historical punchline into a tactile browser game: four Trojans pull, hidden Greeks lean, and one increasingly suspicious guard raises a torch."
            : "TROY HARD is an independent game based on ancient mythology. It is not affiliated with any film, studio, publisher, actor, or game franchise."}
        </p>
        {makingOf ? (
          <>
            <div className="case-study-stats" aria-label="Project facts">
              <div><strong>60 Hz</strong><span>fixed simulation</span></div>
              <div><strong>8</strong><span>authored daily courses</span></div>
              <div><strong>0</strong><span>accounts or databases</span></div>
              <div><strong>90 s</strong><span>maximum run</span></div>
            </div>
            <section>
              <p className="section-label">01 · THE CONSTRAINT</p>
              <h2>Explain nothing twice.</h2>
              <p>No account, installation, modal tutorial, or upgrade tree. The first press moves the rope, the first drag shifts the weight, and releasing the same input brakes and braces. Controls retire only after the player demonstrates them.</p>
            </section>
            <section>
              <p className="section-label">02 · THE PHYSICAL JOKE</p>
              <h2>Readable danger, recoverable mistakes.</h2>
              <p>Heaving loads the ropes before the wheels move. Roughness, slope, acceleration, and hidden weight all feed the pitch. Dangerous states must persist before they fail, so the horse feels awkward without feeling random. Inspections telegraph with a torch, a guard silhouette, sound, and the terracotta truth sweep.</p>
            </section>
            <div className="process-gallery">
              {PROCESS_IMAGES.map((image) => (
                <figure key={image.src}>
                  <img src={image.src} alt={image.alt} loading="lazy" />
                  <figcaption>{image.caption}</figcaption>
                </figure>
              ))}
            </div>
            <section>
              <p className="section-label">03 · DETERMINISM</p>
              <h2>Friendly competition without a backend.</h2>
              <p>The game runs a fixed 60 Hz simulation and renders between simulation states. Daily courses combine two tested variants per act. Friend links encode the exact seed, ruleset, target result, and assist modifier in a bounded base-36 token; CRC32 catches damage, but is deliberately not sold as anti-cheat security.</p>
              <div className="architecture-flow" aria-label="Game architecture">
                <span>INPUT</span><b>→</b><span>60 HZ SIM</span><b>→</b><span>PHASER WORLD</span><b>→</b><span>REACT HUD</span><b>→</b><span>STATELESS DUEL</span>
              </div>
            </section>
            <section>
              <p className="section-label">04 · ART DIRECTION</p>
              <h2>Living pottery, built as production pieces.</h2>
              <p>Five locked compositions set the camera, palette, typography, and tone. Production environments, horse, pullers, inspector poses, and result scenes were then generated separately, keyed, cleaned, compressed, and rejected when hands, ropes, wheels, or silhouettes did not read. The UI remains code-native for sharp scaling and keyboard access.</p>
            </section>
            <section>
              <p className="section-label">05 · BUILT WITH CODEX</p>
              <h2>A small game treated like a real creative system.</h2>
              <p>Codex helped turn the initial one-line premise into gameplay tuning, independent visual production, deterministic QA, accessibility checks, and release hardening. The useful part was not raw code volume—it was keeping game design, art direction, browser behavior, and share mechanics in the same feedback loop.</p>
            </section>
            <a className="case-study-cta" href="/">PLAY A SIEGE <span>Usually 70–90 seconds</span></a>
          </>
        ) : (
          <>
            <section><p className="section-label">ORIGINAL PRODUCTION</p><h2>Art and sound</h2><p>Visual assets were created specifically for this project from original project prompts and approved compositions. Chroma-key pieces were cleaned and inspected locally. The adaptive percussion, wood, rope, and bronze soundscape is synthesized at runtime with Web Audio. No third-party recordings are distributed.</p></section>
            <section><p className="section-label">TYPE & TECHNOLOGY</p><h2>Open type, independent code.</h2><p>Archivo Variable and IBM Plex Mono are distributed under the SIL Open Font License 1.1. The game uses React, Phaser, Vite, TypeScript, and Vercel’s analytics and image tooling. Project-specific art, writing, and code remain copyright Ayush Agarwal.</p></section>
            <section><p className="section-label">PRIVACY</p><h2>No player profile leaves the device.</h2><p>Personal bests and preferences stay in local storage. Anonymous aggregate analytics use broad score and time buckets, never exact results, challenge tokens, names, emails, or persistent player identifiers. Global Privacy Control and Do Not Track are respected.</p></section>
            <section><p className="section-label">FRIENDLY COMPETITION</p><h2>Scores are self-reported.</h2><p>There are no prizes, authoritative records, public leaderboards, account profiles, ads, or tracking identifiers. A challenge URL contains only bounded numeric game data and a corruption checksum.</p></section>
            <section>
              <p className="section-label">YOUR DEVICE</p>
              <h2>Clear local data</h2>
              <p>This removes saved preferences, recent runs, and personal bests from this browser only.</p>
              <GameButton variant="quiet" onClick={() => { clearProfile(); setDataCleared(true) }}>CLEAR LOCAL DATA</GameButton>
              {dataCleared ? <p className="clear-confirmation" role="status">Local game data cleared.</p> : null}
            </section>
          </>
        )}
        <footer>
          <a href="https://ayushdev.com/" target="_blank" rel="noopener noreferrer" onClick={() => trackGameEvent("creator_click", { surface: kind })}>Built by Ayush Agarwal</a>
          <a href={makingOf ? "/credits/" : "/making-of/"}>{makingOf ? "Credits & privacy" : "Read the making-of"}</a>
        </footer>
      </article>
    </main>
  )
}
