import { decodeChallenge } from "../src/game/challenge"
import { rankForScore } from "../src/game/score"

function responseHtml(origin: string, token: string, score: number, elapsedMs: number, suspicion: number) {
  const path = `/c/${token}`
  const canonical = `${origin}/`
  const challengeUrl = `${origin}${path}`
  const ogUrl = `${origin}/api/og/${token}`
  const title = `Beat ${score.toLocaleString("en-US")} in TROY HARD`
  const description = `${rankForScore(score)} · ${(elapsedMs / 1_000).toFixed(1)}s · ${suspicion}% suspicion. Same siege. Better score.`
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta name="robots" content="noindex,follow" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="TROY HARD" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${challengeUrl}" />
  <meta property="og:image" content="${ogUrl}" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="TROY HARD challenge score card" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${ogUrl}" />
  <meta name="twitter:image:alt" content="TROY HARD challenge score card" />
  <meta http-equiv="refresh" content="0;url=/?c=${token}" />
</head>
<body style="margin:0;background:#171310;color:#f1dfc0;font:700 20px system-ui;display:grid;min-height:100vh;place-items:center">
  <p>Rolling the horse into position… <a style="color:#d6ae70" href="/?c=${token}">Enter Troy</a></p>
</body>
</html>`
}

export default function handler(request: Request) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } })
  }
  const requestUrl = new URL(request.url)
  const token = requestUrl.searchParams.get("token") ?? ""
  const challenge = decodeChallenge(token)
  if (!challenge) {
    return Response.redirect(`${requestUrl.origin}/?invalidChallenge=1`, 302)
  }
  return new Response(
    responseHtml(requestUrl.origin, token.toLowerCase(), challenge.targetScore ?? 0, challenge.targetElapsedMs ?? 0, challenge.targetSuspicionPct ?? 0),
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, s-maxage=31536000, immutable",
        "X-Robots-Tag": "noindex, follow",
      },
    },
  )
}
