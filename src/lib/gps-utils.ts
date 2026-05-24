import type { RoutePoint } from "./types"

const MAX_ACCURACY_M = 100
const MAX_SPEED_M_S = 7.5
const SMOOTHING_WINDOW = 3

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function isGpsPointValid(
  point: RoutePoint,
  previous?: RoutePoint | null
): boolean {
  if (point.accuracy != null && point.accuracy > MAX_ACCURACY_M) return false
  if (!previous) return true

  const deltaTime = (point.timestamp - previous.timestamp) / 1000
  if (deltaTime <= 0) return false

  const distance = haversineDistance(
    previous.lat,
    previous.lng,
    point.lat,
    point.lng
  )
  const speed = (distance * 1000) / deltaTime
  if (speed > MAX_SPEED_M_S) return false

  return true
}

export function smoothPoints(points: RoutePoint[]): RoutePoint[] {
  if (points.length < SMOOTHING_WINDOW) return points
  const smoothed: RoutePoint[] = [points[0]]
  for (let i = 1; i < points.length - 1; i++) {
    const window = points.slice(Math.max(0, i - 1), i + 2)
    const lat = window.reduce((s, p) => s + p.lat, 0) / window.length
    const lng = window.reduce((s, p) => s + p.lng, 0) / window.length
    smoothed.push({ ...points[i], lat, lng })
  }
  smoothed.push(points[points.length - 1])
  return smoothed
}

export function calculateTotalDistance(points: RoutePoint[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += haversineDistance(
      points[i - 1].lat,
      points[i - 1].lng,
      points[i].lat,
      points[i].lng
    )
  }
  return total
}

export function calculatePace(distanceKm: number, seconds: number): number | null {
  if (distanceKm <= 0 || seconds <= 0) return null
  return seconds / 60 / distanceKm
}

export function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.floor(totalSeconds % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

export function formatPace(paceMinPerKm: number | null): string {
  if (paceMinPerKm == null || !isFinite(paceMinPerKm)) return "--:--"
  const minutes = Math.floor(paceMinPerKm)
  const seconds = Math.round((paceMinPerKm - minutes) * 60)
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}
