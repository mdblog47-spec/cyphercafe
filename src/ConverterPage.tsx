import { ChangeEvent, DragEvent, useMemo, useState } from "react"
import { jsPDF } from "jspdf"
import JSZip from "jszip"
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist"
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"

GlobalWorkerOptions.workerSrc = workerUrl

type Conversion = {
  id: string
  title: string
  description: string
  from: "image" | "pdf"
  to: "image/png" | "image/jpeg" | "image/webp" | "pdf"
  output: string
}

const conversions: Conversion[] = [
  {
    id: "jpg-png",
    title: "JPG to PNG",
    description: "Transparent-ready PNG image",
    from: "image",
    to: "image/png",
    output: "PNG",
  },
  {
    id: "png-jpg",
    title: "PNG to JPG",
    description: "Smaller, widely supported image",
    from: "image",
    to: "image/jpeg",
    output: "JPG",
  },
  {
    id: "image-webp",
    title: "Image to WebP",
    description: "Modern compressed web image",
    from: "image",
    to: "image/webp",
    output: "WEBP",
  },
  {
    id: "pdf-jpg",
    title: "PDF to JPG",
    description: "Every PDF page as an image",
    from: "pdf",
    to: "image/jpeg",
    output: "JPG",
  },
  {
    id: "pdf-png",
    title: "PDF to PNG",
    description: "High-quality page images",
    from: "pdf",
    to: "image/png",
    output: "PNG",
  },
  {
    id: "image-pdf",
    title: "Image to PDF",
    description: "Print-ready A4 PDF document",
    from: "image",
    to: "pdf",
    output: "PDF",
  },
]

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const baseName = (name: string) => name.replace(/\.[^.]+$/, "")

const loadImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(file)
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("This image could not be opened."))
    }
    image.src = url
  })

const canvasBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Conversion failed.")),
      type,
      quality,
    ),
  )

export default function ConverterPage({
  notify,
}: {
  notify: (message: string) => void
}) {
  const [selected, setSelected] = useState(conversions[0])
  const [file, setFile] = useState<File | null>(null)
  const [quality, setQuality] = useState(92)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState("")
  const [dragging, setDragging] = useState(false)

  const accepted =
    selected.from === "pdf"
      ? ".pdf,application/pdf"
      : "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
  const fileIsValid = useMemo(() => {
    if (!file) return false
    return selected.from === "pdf"
      ? file.type === "application/pdf" ||
          file.name.toLowerCase().endsWith(".pdf")
      : file.type.startsWith("image/")
  }, [file, selected])

  const chooseConversion = (conversion: Conversion) => {
    setSelected(conversion)
    setFile(null)
    setProgress("")
  }

  const receiveFiles = (files: FileList | null) => {
    if (!files?.[0]) return
    setFile(files[0])
    setProgress("")
  }

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setDragging(false)
    receiveFiles(event.dataTransfer.files)
  }

  const convertImage = async (source: File) => {
    const image = await loadImage(source)
    if (selected.to === "pdf") {
      const orientation = image.width > image.height ? "landscape" : "portrait"
      const document = new jsPDF({ orientation, unit: "mm", format: "a4" })
      const pageWidth = document.internal.pageSize.getWidth()
      const pageHeight = document.internal.pageSize.getHeight()
      const ratio = Math.min(
        (pageWidth - 16) / image.width,
        (pageHeight - 16) / image.height,
      )
      const width = image.width * ratio
      const height = image.height * ratio
      const flat = window.document.createElement("canvas")
      flat.width = image.naturalWidth
      flat.height = image.naturalHeight
      const flatContext = flat.getContext("2d")
      if (!flatContext)
        throw new Error("Your browser does not support image conversion.")
      flatContext.fillStyle = "#ffffff"
      flatContext.fillRect(0, 0, flat.width, flat.height)
      flatContext.drawImage(image, 0, 0)
      document.addImage(
        flat.toDataURL("image/jpeg", 0.92),
        "JPEG",
        (pageWidth - width) / 2,
        (pageHeight - height) / 2,
        width,
        height,
      )
      downloadBlob(document.output("blob"), `${baseName(source.name)}.pdf`)
      return
    }

    const canvas = document.createElement("canvas")
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext("2d")
    if (!context)
      throw new Error("Your browser does not support image conversion.")
    if (selected.to === "image/jpeg") {
      context.fillStyle = "#ffffff"
      context.fillRect(0, 0, canvas.width, canvas.height)
    }
    context.drawImage(image, 0, 0)
    const extension = selected.to.split("/")[1].replace("jpeg", "jpg")
    const blob = await canvasBlob(canvas, selected.to, quality / 100)
    downloadBlob(blob, `${baseName(source.name)}.${extension}`)
  }

  const convertPdf = async (source: File) => {
    const bytes = new Uint8Array(await source.arrayBuffer())
    const pdf = await getDocument({ data: bytes }).promise
    const zip = new JSZip()
    const extension = selected.to === "image/png" ? "png" : "jpg"

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      setProgress(`Converting page ${pageNumber} of ${pdf.numPages}`)
      const page = await pdf.getPage(pageNumber)
      const viewport = page.getViewport({ scale: 2 })
      const canvas = document.createElement("canvas")
      canvas.width = viewport.width
      canvas.height = viewport.height
      const context = canvas.getContext("2d")
      if (!context)
        throw new Error("Your browser does not support PDF rendering.")
      if (selected.to === "image/jpeg") {
        context.fillStyle = "#ffffff"
        context.fillRect(0, 0, canvas.width, canvas.height)
      }
      await page.render({ canvas, canvasContext: context, viewport }).promise
      const blob = await canvasBlob(canvas, selected.to, quality / 100)
      zip.file(
        `${baseName(source.name)}-page-${String(pageNumber).padStart(2, "0")}.${extension}`,
        blob,
      )
    }

    setProgress("Preparing ZIP download")
    const result = await zip.generateAsync({ type: "blob" })
    downloadBlob(result, `${baseName(source.name)}-${extension}-pages.zip`)
  }

  const runConversion = async () => {
    if (!file || !fileIsValid) return
    setBusy(true)
    setProgress("Preparing your file")
    try {
      if (selected.from === "pdf") await convertPdf(file)
      else await convertImage(file)
      setProgress("Download ready")
      notify("Conversion complete — your download has started")
    } catch (error) {
      setProgress("")
      notify(error instanceof Error ? error.message : "File conversion failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="page-heading section-heading">
        <div>
          <p className="eyebrow">LOCAL UTILITIES</p>
          <h1>File converter</h1>
          <span>
            Convert customer documents privately—nothing leaves this computer.
          </span>
        </div>
        <div className="privacy-pill">
          <ShieldIcon /> 100% on-device
        </div>
      </div>
      <div className="converter-layout">
        <aside className="panel converter-menu">
          <div className="converter-menu-head">
            <span>CONVERSION TYPE</span>
            <b>Choose a tool</b>
          </div>
          {conversions.map((conversion) => (
            <button
              key={conversion.id}
              className={selected.id === conversion.id ? "selected" : ""}
              onClick={() => chooseConversion(conversion)}
            >
              <span className="format-pair">
                <i>{conversion.from === "image" ? "IMG" : "PDF"}</i>
                <ArrowIcon />
                <i>{conversion.output}</i>
              </span>
              <span>
                <b>{conversion.title}</b>
                <small>{conversion.description}</small>
              </span>
            </button>
          ))}
        </aside>
        <section className="panel converter-workspace">
          <div className="converter-title">
            <div className="converter-big-icon">
              {selected.from === "pdf" ? "PDF" : "IMG"}
            </div>
            <div>
              <span>ACTIVE CONVERTER</span>
              <h2>{selected.title}</h2>
              <p>{selected.description}</p>
            </div>
          </div>
          <label
            className={`drop-zone ${dragging ? "dragging" : ""} ${
              file ? "has-file" : ""
            }`}
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <input
              type="file"
              accept={accepted}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                receiveFiles(event.target.files)
              }
            />
            {file ? (
              <>
                <div className="selected-file-icon">
                  <FileIcon />
                </div>
                <b>{file.name}</b>
                <span>
                  {(file.size / 1024 / 1024).toFixed(2)} MB · Click to replace
                </span>
                {!fileIsValid && (
                  <em>
                    Please choose a valid{" "}
                    {selected.from === "pdf" ? "PDF" : "image"} file.
                  </em>
                )}
              </>
            ) : (
              <>
                <div className="upload-icon">
                  <UploadIcon />
                </div>
                <b>
                  Drop your {selected.from === "pdf" ? "PDF" : "image"} here
                </b>
                <span>or click to browse from this computer</span>
                <small>
                  {selected.from === "pdf"
                    ? "PDF documents"
                    : "JPG, PNG and WebP images"}{" "}
                  · Maximum recommended size 50 MB
                </small>
              </>
            )}
          </label>
          {selected.to !== "pdf" && (
            <div className="quality-control">
              <div>
                <b>Output quality</b>
                <span>Higher quality creates a larger file</span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                value={quality}
                onChange={(event) => setQuality(Number(event.target.value))}
              />
              <strong>{quality}%</strong>
            </div>
          )}
          <div className="converter-footer">
            <div className="local-note">
              <ShieldIcon />
              <span>
                <b>Your file stays private</b>
                <small>Processed inside this browser and never uploaded.</small>
              </span>
            </div>
            <button
              className="primary-button convert-button"
              disabled={!fileIsValid || busy}
              onClick={runConversion}
            >
              {busy ? <span className="spinner" /> : <ConvertIcon />}
              {busy ? progress : `Convert to ${selected.output}`}
            </button>
          </div>
        </section>
      </div>
    </>
  )
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v5h14v-5" />
    </svg>
  )
}
function FileIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M6 2h8l4 4v16H6zM14 2v5h5M9 13h6M9 17h6" />
    </svg>
  )
}
function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M12 3 5 6v5c0 4.8 2.9 8.1 7 10 4.1-1.9 7-5.2 7-10V6z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M5 12h14m-4-4 4 4-4 4" />
    </svg>
  )
}
function ConvertIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M17 3l4 4-4 4M3 7h18M7 21l-4-4 4-4M21 17H3" />
    </svg>
  )
}
