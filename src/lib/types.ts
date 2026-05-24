export interface Run {
  id: string
  distanceKm: number
  durationSeconds: number
  date: string
  notes?: string
  cadence?: number
  strideLengthCm?: number
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
