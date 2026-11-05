// Renderer ko safe info dena (agle phase mein silent print yahin se jodenge)
const { contextBridge } = require("electron")

contextBridge.exposeInMainWorld("printflowDesktop", {
  isDesktop: true,
  platform: process.platform,
})
