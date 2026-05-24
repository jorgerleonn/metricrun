import type { RoutePoint } from "./types"

const STORAGE_KEY = "metricrun_tracker_session"
const MAX_POSITIONS = 5000

export interface TrackerSession {
  positions: RoutePoint[]
  startTime: number
  elapsedPaused: number
  status: "recording" | "paused"
  updatedAt: number
}

export function saveSession(session: TrackerSession): void {
  try {
    const trimmed = {
      ...session,
      positions: session.positions.slice(-MAX_POSITIONS),
      updatedAt: Date.now(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // Storage full or unavailable
  }
}

export function loadSession(): TrackerSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const session: TrackerSession = JSON.parse(raw)

    const staleMs = 24 * 60 * 60 * 1000
    if (Date.now() - session.updatedAt > staleMs) {
      clearSession()
      return null
    }

    return session
  } catch {
    return null
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Unavailable
  }
}
