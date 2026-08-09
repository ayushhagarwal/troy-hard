import type { RunResult } from "../types"

const failureSources: Record<Exclude<RunResult["outcome"], "success">, string> = {
  spotted: "/assets/art/failure-spotted.webp",
  rollover: "/assets/art/failure-freeze.webp",
  rope_break: "/assets/art/failure-freeze.webp",
  gate_crash: "/assets/art/failure-gate-crash.webp",
  timeout: "/assets/art/failure-timeout.webp",
}

const failureTitles: Record<Exclude<RunResult["outcome"], "success">, string> = {
  spotted: "HORSE CLEARED ITS THROAT",
  rollover: "A VERY NORMAL ROLLOVER",
  rope_break: "THE GIFT WAS LOAD-BEARING",
  gate_crash: "MOST OF IT MADE IT",
  timeout: "TROY CLOSED FOR THE EVENING",
}

function drawCover(context: OffscreenCanvasRenderingContext2D, image: ImageBitmap, width: number, height: number) {
  const scale = Math.max(width / image.width, height / image.height)
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale
  context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight)
}

async function render(result: RunResult) {
  const canvas = new OffscreenCanvas(1_200, 630)
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Offscreen canvas is unavailable")
  const source = result.outcome === "success" ? "/assets/art/success-freeze.webp" : failureSources[result.outcome]
  const response = await fetch(source)
  if (!response.ok) throw new Error("Result artwork is unavailable")
  const bitmap = await createImageBitmap(await response.blob())
  drawCover(context, bitmap, canvas.width, canvas.height)
  bitmap.close()

  const gradient = context.createLinearGradient(520, 0, 1_200, 0)
  gradient.addColorStop(0, "rgba(23,19,16,0)")
  gradient.addColorStop(0.42, "rgba(23,19,16,.9)")
  gradient.addColorStop(1, "rgba(23,19,16,.98)")
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.textAlign = "left"
  context.fillStyle = "#f1dfc0"
  context.font = `900 ${result.outcome === "success" ? 68 : 53}px sans-serif`
  context.fillText(result.outcome === "success" ? "TROY INFILTRATED" : failureTitles[result.outcome], 650, 126)
  context.fillStyle = "#b6452e"
  context.font = "700 92px monospace"
  context.fillText(result.outcome === "success" ? `${(result.elapsedMs / 1_000).toFixed(1)} s` : `${result.progressM.toFixed(0)} m`, 650, 250)
  context.fillStyle = "#f1dfc0"
  context.font = "700 43px sans-serif"
  context.fillText(`${result.score.toLocaleString()}  ·  ${result.rank}`, 650, 322)
  context.fillStyle = "#d6ae70"
  context.font = "500 27px sans-serif"
  context.fillText(`SUSPICION ${result.suspicionPct}%   HORSE ${result.conditionPct}%`, 650, 376)
  context.fillStyle = "#2d6d70"
  context.fillRect(650, 422, 456, 4)
  context.fillStyle = "#f1dfc0"
  context.font = "700 29px sans-serif"
  context.fillText("SAME SIEGE. BETTER SCORE.", 650, 478)
  context.fillStyle = "#d6ae70"
  context.font = "500 24px monospace"
  context.fillText("troyhard.ayushdev.com", 650, 530)
  context.fillStyle = "rgba(241,223,192,.7)"
  context.font = "500 18px sans-serif"
  context.fillText("Built by Ayush · An independent game based on ancient mythology", 650, 573)
  return canvas.convertToBlob({ type: "image/png" })
}

self.onmessage = (event: MessageEvent<RunResult>) => {
  void render(event.data)
    .then((blob) => self.postMessage({ blob }))
    .catch((error: Error) => self.postMessage({ error: error.message }))
}
