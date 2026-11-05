export type JobStatus = "queued" | "printing" | "completed" | "failed"
export type PaymentStatus = "paid" | "pending"

export interface PrintJob {
  id: string
  customer: string
  phone: string
  fileName: string
  pages: number
  copies: number
  color: boolean
  paper: "A4" | "A3"
  side: "Single" | "Double"
  amount: number
  status: JobStatus
  payment: PaymentStatus
  createdAt: string
}

export interface AppSettings {
  shopName: string
  phone: string
  bwPrice: number
  colorPrice: number
  autoPrint: boolean
  acceptJobs: boolean
}

export interface AppData {
  jobs: PrintJob[]
  settings: AppSettings
}
