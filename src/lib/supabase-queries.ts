import { getSupabase } from "./supabase"
import type { Run, RunRoute } from "./types"

interface RunRow {
  id: string
  user_id: string
  name: string | null
  distance_km: number
  duration_seconds: number
  date: string
  notes: string | null
  cadence: number | null
  avg_heart_rate: number | null
  stride_length_cm: number | null
  route_data: Record<string, unknown> | null
}

function parseRouteData(raw: Record<string, unknown> | null): RunRoute | undefined {
  if (!raw) return undefined
  return {
    points: (raw.points as any[]) ?? [],
    totalDistanceKm: (raw.totalDistanceKm as number) ?? 0,
    totalDurationSeconds: (raw.totalDurationSeconds as number) ?? 0,
  }
}

function rowToRun(row: RunRow): Run {
  return {
    id: row.id,
    name: row.name ?? undefined,
    distanceKm: row.distance_km,
    durationSeconds: row.duration_seconds,
    date: row.date,
    notes: row.notes ?? undefined,
    cadence: row.cadence ?? undefined,
    avgHeartRate: row.avg_heart_rate ?? undefined,
    strideLengthCm: row.stride_length_cm ?? undefined,
    routeData: parseRouteData(row.route_data),
  }
}

export async function fetchRuns(userId: string): Promise<Run[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("runs")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map(rowToRun)
}

export async function insertRun(run: Omit<Run, "id">, userId: string): Promise<Run> {
  const supabase = getSupabase()
  const payload: Record<string, unknown> = {
    user_id: userId,
    distance_km: run.distanceKm,
    duration_seconds: run.durationSeconds,
    date: run.date,
  }
  if (run.name) payload.name = run.name
  if (run.notes) payload.notes = run.notes
  if (run.cadence) payload.cadence = run.cadence
  if (run.avgHeartRate) payload.avg_heart_rate = run.avgHeartRate
  if (run.strideLengthCm) payload.stride_length_cm = run.strideLengthCm
  if (run.routeData) payload.route_data = run.routeData

  const { data, error } = await supabase
    .from("runs")
    .insert(payload as never)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return rowToRun(data as unknown as RunRow)
}
