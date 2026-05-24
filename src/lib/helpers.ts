export function formatPace(paceMinPerKm: number): string {
  if (!paceMinPerKm || !isFinite(paceMinPerKm)) return "--:-- min/km"
  const minutes = Math.floor(paceMinPerKm)
  const seconds = Math.round((paceMinPerKm - minutes) * 60)
  return `${minutes}:${seconds.toString().padStart(2, "0")} min/km`
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function secondsToTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

export function timeToSeconds(time: string): number {
  const parts = time.split(":").map(Number)
  return parts[0] * 3600 + parts[1] * 60 + parts[2]
}

export function getDayLabel(date: Date): string {
  return date.toLocaleDateString("es-ES", { weekday: "short" }).slice(0, 3)
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}
