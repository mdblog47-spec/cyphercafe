import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react"
import {
  APP_VERSION,
  clearLicense,
  daysLeft,
  isNewerVersion,
  isValidOffline,
  loadLicense,
  savedDeviceName,
  verifyWithServer,
  type LicenseInfo,
} from "./license"

const RECHECK_EVERY_MS = 6 * 60 * 60 * 1000

const styles: Record<string, CSSProperties> = {
  screen: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 20,
    background: "linear-gradient(160deg, #111a2b, #1d2a40)",
    fontFamily: "inherit",
  },
  card: {
    width: "min(440px, 100%)",
    background: "#fff",
    borderRadius: 14,
    padding: 28,
    boxShadow: "0 20px 60px #00000055",
    color: "#111a2b",
  },
  title: { margin: "0 0 4px", fontSize: 22 },
  sub: { margin: "0 0 18px", fontSize: 13, color: "#5b667a", lineHeight: 1.5 },
  label: { display: "block", fontSize: 12, fontWeight: 600, margin: "12px 0 5px" },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    border: "1px solid #cfd6e2",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
  },
  button: {
    width: "100%",
    marginTop: 18,
    padding: "12px 14px",
    border: 0,
    borderRadius: 8,
    background: "#2f6bff",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  error: {
    marginTop: 14,
    padding: "10px 12px",
    borderRadius: 8,
    background: "#fdecec",
    color: "#b42318",
    fontSize: 12.5,
    lineHeight: 1.45,
  },
  dock: {
    position: "fixed",
    right: 24,
    bottom: 72,
    zIndex: 70,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    alignItems: "flex-end",
    maxWidth: 300,
  },
  pill: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 12px",
    borderRadius: 10,
    fontSize: 11.5,
    boxShadow: "0 8px 24px #11182733",
    background: "#fff",
    color: "#111a2b",
    border: "1px solid #e1e6ef",
  },
  pillButton: {
    border: 0,
    borderRadius: 6,
    padding: "5px 9px",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    background: "#111a2b",
    color: "#fff",
    whiteSpace: "nowrap",
  },
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 90,
    display: "grid",
    placeItems: "center",
    padding: 20,
    background: "#111827aa",
  },
}

function ActivationForm({
  submitLabel,
  initialMessage,
  onSubmit,
}: {
  submitLabel: string
  initialMessage?: string
  onSubmit: (code: string, deviceName: string) => Promise<string | null>
}) {
  const [code, setCode] = useState("")
  const [deviceName, setDeviceName] = useState(savedDeviceName())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(initialMessage || "")

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!code.trim()) {
      setError("Please enter your licence code.")
      return
    }
    setBusy(true)
    setError("")
    const problem = await onSubmit(code, deviceName.trim() || "PC-1")
    if (problem) setError(problem)
    setBusy(false)
  }

  return (
    <form onSubmit={submit}>
      <label style={styles.label}>Licence code</label>
      <input
        style={{ ...styles.input, letterSpacing: 1, textTransform: "uppercase" }}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="PFD-XXXX-XXXX-XXXX"
        autoFocus
        spellCheck={false}
      />
      <label style={styles.label}>This PC's name</label>
      <input
        style={styles.input}
        value={deviceName}
        onChange={(e) => setDeviceName(e.target.value)}
        placeholder="e.g. Counter PC"
        maxLength={40}
      />
      {error && <div style={styles.error}>{error}</div>}
      <button style={{ ...styles.button, opacity: busy ? 0.7 : 1 }} disabled={busy}>
        {busy ? "Checking…" : submitLabel}
      </button>
    </form>
  )
}

export default function LicenseGate({ children }: { children: ReactNode }) {
  const [license, setLicense] = useState<LicenseInfo | null>(() => {
    const saved = loadLicense()
    return saved && isValidOffline(saved) ? saved : null
  })
  const [checking, setChecking] = useState(() => loadLicense() !== null)
  const [message, setMessage] = useState("")
  const [offline, setOffline] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [dismissedNote, setDismissedNote] = useState("")

  const recheck = useCallback(async () => {
    const saved = loadLicense()
    if (!saved) {
      setChecking(false)
      return
    }
    const result = await verifyWithServer(saved.code, saved.deviceName)
    if (result.ok) {
      setLicense(result.license)
      setOffline(false)
      setMessage("")
    } else if (result.reason === "network") {
      setOffline(true)
      if (!isValidOffline(saved)) {
        setLicense(null)
        setMessage("Please connect to the internet once to verify your licence.")
      }
    } else {
      clearLicense()
      setLicense(null)
      setMessage(result.message)
    }
    setChecking(false)
  }, [])

  useEffect(() => {
    recheck()
    const timer = window.setInterval(recheck, RECHECK_EVERY_MS)
    window.addEventListener("online", recheck)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener("online", recheck)
    }
  }, [recheck])

  const activate = async (code: string, deviceName: string) => {
    const result = await verifyWithServer(code, deviceName)
    if (!result.ok) return result.message
    setLicense(result.license)
    setOffline(false)
    setMessage("")
    setShowUpgrade(false)
    return null
  }

  if (!license && checking) {
    return (
      <div style={styles.screen}>
        <div style={{ color: "#fff", fontSize: 14 }}>Checking licence…</div>
      </div>
    )
  }

  if (!license) {
    return (
      <div style={styles.screen}>
        <div style={styles.card}>
          <h1 style={styles.title}>Activate PrintFlow</h1>
          <p style={styles.sub}>
            Enter the code you received. A Demo code starts your free trial, a Lifetime
            code unlocks PrintFlow permanently. The same code works on all your PCs.
          </p>
          <ActivationForm
            submitLabel="Activate"
            initialMessage={message}
            onSubmit={activate}
          />
        </div>
      </div>
    )
  }

  const remaining = daysLeft(license)
  const updateAvailable =
    license.latestVersion !== "" && isNewerVersion(license.latestVersion, APP_VERSION)
  const showNote = license.announcement !== "" && dismissedNote !== license.announcement

  return (
    <>
      {children}

      <div style={styles.dock}>
        {showNote && (
          <div style={{ ...styles.pill, background: "#fff8e6", borderColor: "#f2d58a" }}>
            <span>{license.announcement}</span>
            <button
              style={{ ...styles.pillButton, background: "#8a6100" }}
              onClick={() => setDismissedNote(license.announcement)}
            >
              OK
            </button>
          </div>
        )}
        {updateAvailable && (
          <div style={{ ...styles.pill, background: "#eef4ff", borderColor: "#b9cffd" }}>
            <span>
              <b>Update v{license.latestVersion} available</b>
              {license.updateNotes && (
                <>
                  <br />
                  {license.updateNotes}
                </>
              )}
            </span>
            {license.downloadUrl && (
              <button
                style={{ ...styles.pillButton, background: "#2f6bff" }}
                onClick={() => window.open(license.downloadUrl, "_blank")}
              >
                Download
              </button>
            )}
          </div>
        )}
        {license.plan === "demo" ? (
          <div style={{ ...styles.pill, background: "#fff8e6", borderColor: "#f2d58a" }}>
            <span>
              <b>Demo</b> · {remaining} day{remaining === 1 ? "" : "s"} left
              {offline ? " · offline" : ""}
            </span>
            <button style={styles.pillButton} onClick={() => setShowUpgrade(true)}>
              Enter Lifetime code
            </button>
          </div>
        ) : (
          <div style={{ ...styles.pill, background: "#ecfaf1", borderColor: "#b5e3c6" }}>
            <span>
              ✓ <b>Lifetime</b> · PC {license.pcsUsed}/{license.maxPcs}
              {offline ? " · offline" : ""}
            </span>
          </div>
        )}
      </div>

      {showUpgrade && (
        <div style={styles.backdrop} onMouseDown={() => setShowUpgrade(false)}>
          <div style={styles.card} onMouseDown={(e) => e.stopPropagation()}>
            <h2 style={styles.title}>Unlock Lifetime</h2>
            <p style={styles.sub}>
              Enter your Lifetime code. Your data stays as it is, and all your PCs become
              Lifetime automatically.
            </p>
            <ActivationForm submitLabel="Unlock Lifetime" onSubmit={activate} />
          </div>
        </div>
      )}
    </>
  )
}
