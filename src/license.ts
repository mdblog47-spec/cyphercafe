// PrintFlow licence client — talks to the Google Apps Script licence server (Code.gs)

// 👇 Apps Script "Web app" deploy URL yahan paste karo
export const LICENSE_API_URL =
  "https://script.google.com/macros/s/AKfycbxpqGEqKBbxSudNgBuGkuxV1YCqhlPCarol359BBWwAu2vzl1-9bXqLAerGOeCcvcW1vw/exec"

// package.json ke "version" se automatically aata hai (vite.config.ts mein define hai)
export const APP_VERSION = __APP_VERSION__

const LICENSE_KEY = "printflow-license-v1"
const DEVICE_KEY = "printflow-device-id"
const MAX_SEEN_KEY = "printflow-max-seen-time"
const OFFLINE_GRACE_DAYS = 15
const DAY = 24 * 60 * 60 * 1000

export type Plan = "demo" | "lifetime"

export interface LicenseInfo {
  code: string
  deviceName: string
  plan: Plan
  clientName: string
  expiresAt: string | null
  maxPcs: number
  pcsUsed: number
  lastVerified: number
  latestVersion: string
  downloadUrl: string
  updateNotes: string
  announcement: string
}

export type VerifyResult =
  | { ok: true; license: LicenseInfo }
  | { ok: false; reason: string; message: string }

export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(DEVICE_KEY, id)
    }
    return id
  } catch {
    return "unknown-device"
  }
}

export function loadLicense(): LicenseInfo | null {
  try {
    const raw = localStorage.getItem(LICENSE_KEY)
    return raw ? (JSON.parse(raw) as LicenseInfo) : null
  } catch {
    return null
  }
}

export function saveLicense(license: LicenseInfo) {
  try {
    localStorage.setItem(LICENSE_KEY, JSON.stringify(license))
  } catch {
    // storage full / blocked — app still works for this session
  }
}

export function clearLicense() {
  try {
    localStorage.removeItem(LICENSE_KEY)
  } catch {
    // ignore
  }
}

export function savedDeviceName(): string {
  return loadLicense()?.deviceName || "PC-1"
}

/** Server se code check karo (activation aur har re-check yahi use karta hai) */
export async function verifyWithServer(
  code: string,
  deviceName: string,
): Promise<VerifyResult> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 20000)
  try {
    // Content-Type set nahi kiya — taaki browser preflight (CORS) na bheje, Apps Script ke liye zaroori
    const response = await fetch(LICENSE_API_URL, {
      method: "POST",
      body: JSON.stringify({
        code: code.trim(),
        deviceId: getDeviceId(),
        deviceName,
        appVersion: APP_VERSION,
      }),
      signal: controller.signal,
    })
    const result = await response.json()
    if (!result.ok) {
      return {
        ok: false,
        reason: String(result.reason || "error"),
        message: String(result.message || "Licence check failed."),
      }
    }
    const license: LicenseInfo = {
      code: code.trim().toUpperCase(),
      deviceName,
      plan: result.plan,
      clientName: result.clientName,
      expiresAt: result.expiresAt,
      maxPcs: result.maxPcs,
      pcsUsed: result.pcsUsed,
      lastVerified: Date.now(),
      latestVersion: result.latestVersion || "",
      downloadUrl: result.downloadUrl || "",
      updateNotes: result.updateNotes || "",
      announcement: result.announcement || "",
    }
    saveLicense(license)
    markTimeSeen()
    return { ok: true, license }
  } catch {
    return {
      ok: false,
      reason: "network",
      message: "Could not reach the licence server. Check your internet connection.",
    }
  } finally {
    window.clearTimeout(timer)
  }
}

function markTimeSeen() {
  try {
    const seen = Number(localStorage.getItem(MAX_SEEN_KEY) || 0)
    localStorage.setItem(MAX_SEEN_KEY, String(Math.max(seen, Date.now())))
  } catch {
    // ignore
  }
}

function clockWasRolledBack(): boolean {
  try {
    const seen = Number(localStorage.getItem(MAX_SEEN_KEY) || 0)
    return seen > 0 && Date.now() < seen - DAY
  } catch {
    return false
  }
}

/** Internet na ho (ya server slow ho) tab bhi saved licence se app chalne do — limit ke andar */
export function isValidOffline(license: LicenseInfo): boolean {
  if (clockWasRolledBack()) return false
  const now = Date.now()
  if (now - license.lastVerified > OFFLINE_GRACE_DAYS * DAY) return false
  if (license.plan === "demo") {
    if (!license.expiresAt || now > new Date(license.expiresAt).getTime()) return false
  }
  return true
}

export function daysLeft(license: LicenseInfo): number | null {
  if (license.plan === "lifetime" || !license.expiresAt) return null
  return Math.max(
    0,
    Math.ceil((new Date(license.expiresAt).getTime() - Date.now()) / DAY),
  )
}

/** "1.2.0" > "1.1.9" ? */
export function isNewerVersion(latest: string, current: string): boolean {
  const a = latest.split(".").map((n) => parseInt(n, 10) || 0)
  const b = current.split(".").map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if ((a[i] || 0) > (b[i] || 0)) return true
    if ((a[i] || 0) < (b[i] || 0)) return false
  }
  return false
}
