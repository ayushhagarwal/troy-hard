import { ImageResponse } from "@vercel/og"
import { decodeChallenge } from "../src/game/challenge"
import { rankForScore } from "../src/game/score"

export const config = { runtime: "edge" }

export default function handler(request: Request) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } })
  }
  const token = new URL(request.url).searchParams.get("token") ?? ""
  const challenge = token ? decodeChallenge(token) : null
  if (token && !challenge) {
    return new Response("Invalid challenge", { status: 400, headers: { "Cache-Control": "no-store" } })
  }
  const score = challenge?.targetScore
  const elapsed = challenge?.targetElapsedMs
  const suspicion = challenge?.targetSuspicionPct
  const headline = challenge ? `BEAT ${score?.toLocaleString("en-US")}` : "THE ORIGINAL HEIST."
  const subhead = challenge
    ? `${rankForScore(score ?? 0)} · ${((elapsed ?? 0) / 1_000).toFixed(1)}s · ${suspicion}% suspicion`
    : "Hold to heave. Slide to hide the Greeks."
  const sceneUrl = new URL(challenge ? "/assets/art/success-freeze.webp" : "/assets/art/troy-road-desktop.webp", request.url).toString()
  const horseUrl = new URL("/assets/art/horse.webp", request.url).toString()

  return new ImageResponse(
    <div
      style={{
        width: "1200px",
        height: "630px",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: "#171310",
        color: "#F1DFC0",
        fontFamily: "sans-serif",
      }}
    >
      <img src={sceneUrl} width="1200" height="630" style={{ position: "absolute", inset: 0, width: "1200px", height: "630px", objectFit: "cover" }} />
      {!challenge ? <img src={horseUrl} width="590" height="530" style={{ position: "absolute", left: "-30px", bottom: "-72px", width: "590px", height: "530px", objectFit: "contain" }} /> : null}
      <div style={{ position: "absolute", inset: 0, display: "flex", background: "linear-gradient(90deg,rgba(23,19,16,.08) 0%,rgba(23,19,16,.2) 34%,rgba(23,19,16,.88) 55%,#171310 100%)" }} />
      <div style={{ position: "absolute", left: "500px", top: "44px", width: "4px", height: "542px", background: "#A87432", display: "flex" }} />
      <div style={{ marginLeft: "550px", width: "610px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ color: "#D6AE70", letterSpacing: "14px", fontWeight: 900, fontSize: "28px", display: "flex" }}>TROY HARD</div>
        <div style={{ fontSize: "72px", lineHeight: 0.98, fontWeight: 900, marginTop: "26px", display: "flex" }}>{headline}</div>
        <div style={{ color: "#F1DFC0", opacity: 0.82, fontSize: "28px", marginTop: "24px", display: "flex" }}>{subhead}</div>
        <div style={{ width: "550px", height: "5px", background: "#2D6D70", marginTop: "44px", display: "flex" }} />
        <div style={{ color: "#D6AE70", fontSize: "24px", marginTop: "24px", letterSpacing: "3px", display: "flex" }}>SAME SIEGE. BETTER SCORE.</div>
      </div>
    </div>,
    {
      width: 1_200,
      height: 630,
      headers: {
        "Cache-Control": token ? "public, s-maxage=31536000, immutable" : "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  )
}
