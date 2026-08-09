import assert from "node:assert/strict"
import { mkdir } from "node:fs/promises"
import { chromium } from "playwright"

const baseUrl = "http://127.0.0.1:4173"
const output = process.env.TROY_QA_OUTPUT ?? "/private/tmp/troy-hard-qa"
await mkdir(output, { recursive: true })
const screenshot = (name) => `${output}/${name}`

function challengeToken(seed, score, elapsed, suspicion, modifiers = 0) {
  const fields = [seed, 1, score, elapsed, suspicion, modifiers].map((value) => value.toString(36))
  const body = `v1.${fields.join(".")}`
  let crc = 0xffffffff
  for (let index = 0; index < body.length; index += 1) {
    crc ^= body.charCodeAt(index)
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return `${body}.${((crc ^ 0xffffffff) >>> 0).toString(36)}`
}

const browser = await chromium.launch({ headless: true })
const errors = []
const step = (message) => console.log(`QA: ${message}`)

async function attachDiagnostics(page, name) {
  page.on("pageerror", (error) => {
    errors.push(`${name} pageerror: ${error.message}`)
    console.error(`${name} pageerror: ${error.message}`)
  })
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`${name} console: ${message.text()}`)
      console.error(`${name} console: ${message.text()}`)
    }
  })
}

const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const page = await desktop.newPage()
page.setDefaultTimeout(15_000)
await attachDiagnostics(page, "desktop")
step("desktop title")
await page.goto(`${baseUrl}/?test=1`, { waitUntil: "networkidle" })
await page.getByRole("button", { name: "BEGIN THE PULL" }).waitFor()
assert.equal(await page.getByRole("button", { name: "BEGIN THE PULL" }).isVisible(), true)
await page.screenshot({ path: screenshot("desktop-title.png"), fullPage: true })

step("settings keyboard close")
await page.getByRole("button", { name: "ACCESSIBILITY" }).click()
await page.getByRole("dialog").waitFor()
assert.equal(await page.getByRole("checkbox").count(), 4)
await page.keyboard.press("Escape")
await page.getByRole("dialog").waitFor({ state: "hidden" })

step("keyboard gameplay and pause")
await page.getByRole("button", { name: "BEGIN THE PULL" }).click()
await page.locator("canvas").waitFor()
await page.waitForFunction(() => Boolean(window.__TROY_HARD_TEST__))
const beforeInput = await page.evaluate(() => window.__TROY_HARD_TEST__.snapshot())
await page.keyboard.down("Space")
await page.keyboard.down("KeyD")
await page.waitForTimeout(650)
await page.keyboard.up("KeyD")
await page.keyboard.up("Space")
const afterInput = await page.evaluate(() => window.__TROY_HARD_TEST__.snapshot())
assert.ok(afterInput.progressM > beforeInput.progressM, "heave must advance the horse")
assert.ok(afterInput.balance > beforeInput.balance, "D must shift the hidden Greeks right")

await page.keyboard.press("KeyP")
await page.getByRole("dialog", { name: "The Trojans are pretending this is normal." }).waitFor()
const pausedAt = await page.evaluate(() => window.__TROY_HARD_TEST__.snapshot().elapsedMs)
await page.waitForTimeout(250)
const stillPausedAt = await page.evaluate(() => window.__TROY_HARD_TEST__.snapshot().elapsedMs)
assert.equal(stillPausedAt, pausedAt, "P must pause the fixed-step simulation")
await page.keyboard.press("KeyP")
await page.getByRole("dialog", { name: "The Trojans are pretending this is normal." }).waitFor({ state: "hidden" })
await page.waitForTimeout(120)
const resumedAt = await page.evaluate(() => window.__TROY_HARD_TEST__.snapshot().elapsedMs)
assert.ok(resumedAt > stillPausedAt, "P must resume the fixed-step simulation")

await page.evaluate(() => window.__TROY_HARD_TEST__.inspect())
await page.getByText("TORCH RAISED · SETTLE THE HORSE").waitFor()
await page.evaluate(() => window.__TROY_HARD_TEST__.inspect(true))
await page.waitForFunction(() => window.__TROY_HARD_TEST__.snapshot().inspection.phase === "active")
await page.getByText("DO NOT LOOK SELF-PROPELLED").waitFor()
await page.screenshot({ path: screenshot("desktop-inspection.png"), fullPage: true })
await page.screenshot({ path: screenshot("desktop-gameplay.png"), fullPage: true })
step("success result")
await page.evaluate(() => window.__TROY_HARD_TEST__.success())
await page.getByRole("heading", { name: "TROY INFILTRATED" }).waitFor()
await page.screenshot({ path: screenshot("desktop-success.png"), fullPage: true })
assert.equal(await page.getByRole("button", { name: "CHALLENGE A FRIEND" }).isVisible(), true)
await page.getByRole("button", { name: "Download score card" }).waitFor({ timeout: 8_000 })

step("failure result and retry")
await page.getByRole("button", { name: "RETRY THIS SIEGE" }).click({ timeout: 3_000 }).catch(() => undefined)
await page.locator(".results-screen").waitFor({ state: "detached", timeout: 60_000 })
await page.waitForFunction(() => Boolean(window.__TROY_HARD_TEST__) && !window.__TROY_HARD_TEST__.snapshot().ended, undefined, { timeout: 60_000 })
await page.evaluate(() => window.__TROY_HARD_TEST__.fail("rope_break"))
await page.getByRole("heading", { name: "THE GIFT WAS LOAD-BEARING." }).waitFor()
await page.screenshot({ path: screenshot("desktop-failure.png"), fullPage: true })
const retryStarted = Date.now()
const previousRestart = await page.evaluate(() => window.__TROY_HARD_TEST__.lastRestartMs)
await page.getByRole("button", { name: "TRY AGAIN" }).click({ timeout: 3_000 }).catch(() => undefined)
await page.locator(".results-screen").waitFor({ state: "detached", timeout: 60_000 })
await page.waitForFunction((previous) => Boolean(window.__TROY_HARD_TEST__) && window.__TROY_HARD_TEST__.lastRestartMs > previous && !window.__TROY_HARD_TEST__.snapshot().ended, previousRestart, { timeout: 60_000 })
const retryElapsed = Date.now() - retryStarted
const internalRetryElapsed = await page.evaluate(() => window.__TROY_HARD_TEST__.lastRestartMs - window.__TROY_RETRY_REQUEST_MS__)
console.log(`QA: retry reset in ${internalRetryElapsed.toFixed(0)}ms (${retryElapsed}ms including throttled headless rendering)`)
assert.ok(internalRetryElapsed < 1_000, "same-session application retry must be under one second")

step("retry during failure freeze cancels stale result")
const restartBeforeFreeze = await page.evaluate(() => window.__TROY_HARD_TEST__.lastRestartMs)
await page.evaluate(() => window.__TROY_HARD_TEST__.fail("timeout"))
await page.keyboard.press("KeyR")
await page.waitForFunction((previous) => window.__TROY_HARD_TEST__.lastRestartMs > previous && !window.__TROY_HARD_TEST__.snapshot().ended, restartBeforeFreeze, { timeout: 60_000 })
await page.waitForTimeout(1_400)
assert.equal(await page.locator(".results-screen").count(), 0, "old failure timer must not overwrite a restarted siege")

step("duel and invalid token")
const token = challengeToken(77, 8_420, 72_400, 3)
await page.goto(`${baseUrl}/?c=${token}&test=1`, { waitUntil: "networkidle" })
await page.getByText("BEAT 8,420").waitFor()
await page.goto(`${baseUrl}/?c=damaged-token`, { waitUntil: "networkidle" })
await page.getByText("That ancient message was damaged").waitFor()
step("portfolio routes")
await page.goto(`${baseUrl}/making-of/`, { waitUntil: "networkidle" })
await page.getByRole("heading", { name: "A physics heist inside a wooden horse." }).waitFor()
await page.goto(`${baseUrl}/credits/`, { waitUntil: "networkidle" })
await page.getByRole("heading", { name: "Built independently. Stored locally." }).waitFor()

const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
})
const phone = await mobile.newPage()
phone.setDefaultTimeout(15_000)
await attachDiagnostics(phone, "mobile")
step("portrait title and gameplay")
await phone.goto(`${baseUrl}/?test=1`, { waitUntil: "networkidle" })
const touchTargets = await phone.locator("button").evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height))
assert.equal(touchTargets.every((height) => height >= 48), true, "mobile buttons must be at least 48px tall")
assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, "portrait must not overflow horizontally")
await phone.screenshot({ path: screenshot("mobile-title.png"), fullPage: true })
await phone.getByRole("button", { name: "BEGIN THE PULL" }).tap()
await phone.locator("canvas").waitFor()
await phone.waitForFunction(() => Boolean(window.__TROY_HARD_TEST__))
const canvas = await phone.locator("canvas").boundingBox()
assert.ok(canvas)
await phone.touchscreen.tap(canvas.x + canvas.width * 0.5, canvas.y + canvas.height * 0.76)
await phone.screenshot({ path: screenshot("mobile-gameplay.png"), fullPage: true })

const compact = await browser.newContext({ viewport: { width: 320, height: 568 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
const compactPhone = await compact.newPage()
compactPhone.setDefaultTimeout(15_000)
await attachDiagnostics(compactPhone, "compact")
step("compact phone has no clipped actions")
await compactPhone.goto(`${baseUrl}/?test=1`, { waitUntil: "networkidle" })
for (const name of ["SOUND ON", "ACCESSIBILITY", "PRACTICE"]) {
  const button = compactPhone.getByRole("button", { name })
  assert.equal(await button.isVisible(), true, `${name} must be visible at 320×568`)
  const box = await button.boundingBox()
  assert.ok(box && box.y >= 0 && box.y + box.height <= 568, `${name} must not be clipped at 320×568`)
}
await compactPhone.screenshot({ path: screenshot("compact-title.png"), fullPage: true })
await compactPhone.getByRole("button", { name: "BEGIN THE PULL" }).tap()
await compactPhone.waitForFunction(() => Boolean(window.__TROY_HARD_TEST__))
await compactPhone.evaluate(() => window.__TROY_HARD_TEST__.success())
await compactPhone.getByRole("heading", { name: "TROY INFILTRATED" }).waitFor()
assert.equal(await compactPhone.getByRole("button", { name: "Back to title" }).isVisible(), true)
await compactPhone.screenshot({ path: screenshot("compact-success.png"), fullPage: true })

await compact.close()

await mobile.close()
await desktop.close()
await browser.close()

assert.deepEqual(errors, [], `browser errors:\n${errors.join("\n")}`)
console.log("E2E PASS: controls, pause, inspection, results, retry safety, duels, portfolio routes, portrait, and compact mobile")
