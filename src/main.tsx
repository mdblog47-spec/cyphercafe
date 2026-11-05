import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import LicenseGate from "./LicenseGate"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LicenseGate>
      <App />
    </LicenseGate>
  </React.StrictMode>,
)

// Service worker sirf normal web (http/https) pe; desktop app (app://) mein zaroorat nahi
if (
  "serviceWorker" in navigator &&
  import.meta.env.PROD &&
  location.protocol.startsWith("http")
) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
  })
}
