import type { RunResult } from "../types"
import { buildChallengeURL, shareCaption } from "./challenge"

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = source
  })
}

function drawCover(context: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight)
  const drawWidth = image.naturalWidth * scale
  const drawHeight = image.naturalHeight * scale
  context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight)
}

async function renderResultCardOnMainThread(result: RunResult): Promise<Blob> {
  await document.fonts.ready
  const canvas = document.createElement("canvas")
  canvas.width = 1_200
  canvas.height = 630
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Canvas rendering is unavailable")
  const failureSources: Record<Exclude<RunResult["outcome"], "success">, string> = {
    spotted: "/assets/art/failure-spotted.webp",
    rollover: "/assets/art/failure-freeze.webp",
    rope_break: "/assets/art/failure-freeze.webp",
    gate_crash: "/assets/art/failure-gate-crash.webp",
    timeout: "/assets/art/failure-timeout.webp",
  }
  const source = result.outcome === "success" ? "/assets/art/success-freeze.webp" : failureSources[result.outcome]
  drawCover(context, await loadImage(source), canvas.width, canvas.height)

  const gradient = context.createLinearGradient(520, 0, 1_200, 0)
  gradient.addColorStop(0, "rgba(23,19,16,0)")
  gradient.addColorStop(0.42, "rgba(23,19,16,.9)")
  gradient.addColorStop(1, "rgba(23,19,16,.98)")
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.textAlign = "left"
  context.fillStyle = "#f1dfc0"
  context.font = "900 68px Archivo, sans-serif"
  const failureTitle: Record<Exclude<RunResult["outcome"], "success">, string> = {
    spotted: "HORSE CLEARED ITS THROAT",
    rollover: "A VERY NORMAL ROLLOVER",
    rope_break: "THE GIFT WAS LOAD-BEARING",
    gate_crash: "MOST OF IT MADE IT",
    timeout: "TROY CLOSED FOR THE EVENING",
  }
  context.font = `900 ${result.outcome === "success" ? 68 : 53}px Archivo, sans-serif`
  context.fillText(result.outcome === "success" ? "TROY INFILTRATED" : failureTitle[result.outcome], 650, 126)
  context.fillStyle = "#b6452e"
  context.font = "700 92px 'IBM Plex Mono', monospace"
  context.fillText(result.outcome === "success" ? `${(result.elapsedMs / 1_000).toFixed(1)} s` : `${result.progressM.toFixed(0)} m`, 650, 250)
  context.fillStyle = "#f1dfc0"
  context.font = "700 43px Archivo, sans-serif"
  context.fillText(`${result.score.toLocaleString()}  ·  ${result.rank}`, 650, 322)
  context.fillStyle = "#d6ae70"
  context.font = "500 27px Archivo, sans-serif"
  context.fillText(`SUSPICION ${result.suspicionPct}%   HORSE ${result.conditionPct}%`, 650, 376)
  context.fillStyle = "#2d6d70"
  context.fillRect(650, 422, 456, 4)
  context.fillStyle = "#f1dfc0"
  context.font = "700 29px Archivo, sans-serif"
  context.fillText("SAME SIEGE. BETTER SCORE.", 650, 478)
  context.fillStyle = "#d6ae70"
  context.font = "500 24px 'IBM Plex Mono', monospace"
  context.fillText("troyhard.ayushdev.com", 650, 530)
  context.fillStyle = "rgba(241,223,192,.7)"
  context.font = "500 18px Archivo, sans-serif"
  context.fillText("Built by Ayush · An independent game based on ancient mythology", 650, 573)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not render result card"))), "image/png")
  })
}

export async function renderResultCard(result: RunResult): Promise<Blob> {
  if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") {
    return renderResultCardOnMainThread(result)
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./resultCard.worker.ts", import.meta.url), { type: "module" })
    let settled = false
    const fallback = () => {
      if (settled) return
      settled = true
      worker.terminate()
      void renderResultCardOnMainThread(result).then(resolve, reject)
    }
    worker.onmessage = (event: MessageEvent<{ blob?: Blob; error?: string }>) => {
      if (!event.data.blob) {
        fallback()
        return
      }
      if (settled) return
      settled = true
      worker.terminate()
      resolve(event.data.blob)
    }
    worker.onerror = fallback
    worker.postMessage(result)
  })
}

export async function shareNative(result: RunResult, blob: Blob | null) {
  const origin = window.location.origin
  const url = buildChallengeURL(result, origin)
  if (blob) {
    const file = new File([blob], "troy-hard-result.png", { type: "image/png" })
    const data: ShareData = { title: "TROY HARD", text: shareCaption(result), url, files: [file] }
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share(data)
      return true
    }
  }
  if (navigator.share) {
    await navigator.share({ title: "TROY HARD", text: shareCaption(result), url })
    return true
  }
  return false
}

export function downloadCard(blob: Blob) {
  const anchor = document.createElement("a")
  anchor.href = URL.createObjectURL(blob)
  anchor.download = "troy-hard-result.png"
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(anchor.href), 1_000)
}
