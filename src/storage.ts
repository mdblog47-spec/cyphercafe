import { useCallback, useEffect, useState } from "react"
import { initialData } from "./data"
import type { AppData } from "./types"

const STORAGE_KEY = "printflow-erp-v1"

function loadData(): AppData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved) as AppData
  } catch {
    // Corrupt browser data should not block the app from loading.
  }
  return initialData
}

export function useLocalData() {
  const [data, setData] = useState<AppData>(loadData)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  const resetData = useCallback(() => {
    setData(initialData)
  }, [])

  return { data, setData, resetData }
}
