// PrintFlow desktop app (Electron main process)
const { app, BrowserWindow, Menu, net, protocol, shell } = require("electron")
const path = require("node:path")
const { pathToFileURL } = require("node:url")

const DIST = path.join(__dirname, "..", "dist")

// Custom "app://" scheme: file:// ke jagah isse localStorage, web workers (PDF converter) aur
// fetch sab normal website ki tarah chalte hain.
protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
])

// Ek hi window: dobara icon kholne par wahi window aage aayegi
if (!app.requestSingleInstanceLock()) {
  app.quit()
}

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: "#f4f6f9",
    title: "PrintFlow",
    icon: path.join(__dirname, "..", "build", "icon.png"),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  })

  // http/https links (jaise Update > Download) default browser mein kholo
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url)
    return { action: "deny" }
  })
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("app://")) {
      event.preventDefault()
      if (/^https?:\/\//i.test(url)) shell.openExternal(url)
    }
  })

  mainWindow.loadURL("app://printflow/index.html")
  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

app.whenReady().then(() => {
  protocol.handle("app", async (request) => {
    try {
      const { pathname } = new URL(request.url)
      let relative = decodeURIComponent(pathname)
      if (relative === "/" || relative === "") relative = "/index.html"
      const filePath = path.normalize(path.join(DIST, relative))
      // dist folder ke bahar ki files kabhi serve nahi hongi
      if (!filePath.startsWith(DIST + path.sep)) {
        return new Response("Forbidden", { status: 403 })
      }
      return await net.fetch(pathToFileURL(filePath).toString())
    } catch {
      return new Response("Not found", { status: 404 })
    }
  })

  Menu.setApplicationMenu(null)
  createWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})
