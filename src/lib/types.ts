export interface Run {
  id: string
  distanceKm: number
  durationSeconds: number
  date: string
  notes?: string
  cadence?: number
  strideLengthCm?: number
  routeData?: RunRoute
}

export interface RoutePoint {
  lat: number
  lng: number
  timestamp: number
  accuracy?: number
}

export interface RunRoute {
  points: RoutePoint[]
  totalDistanceKm: number
  totalDurationSeconds: number
}

export type TrackerStatus = "idle" | "requesting" | "recording" | "paused" | "finished" | "error"

export interface LiveMetrics {
  elapsedSeconds: number
  distanceKm: number
  currentPaceMinPerKm: number | null
}

export interface WeeklyStats {
  totalDistanceKm: number
  averagePaceMinPerKm: number
  totalRuns: number
}

export interface DailyDistance {
  date: string
  distanceKm: number
  dayLabel: string
}
