import { getSupabase } from "./supabase"
import type { Run } from "./types"

interface RunRow {
  id: string
  distance_km: number
  duration_seconds: number
  date: string
  notes: string | null
  cadence: number | null
  stride_length_cm: number | null
}

function rowToRun(row: RunRow): Run {
  return {
    id: row.id,
    distanceKm: row.distance_km,
    durationSeconds: row.duration_seconds,
    date: row.date,
    notes: row.notes ?? undefined,
    cadence: row.cadence ?? undefined,
    strideLengthCm: row.stride_length_cm ?? undefined,
  }
}

export async function fetchRuns(): Promise<Run[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("runs")
    .select("*")
    .order("date", { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map(rowToRun)
}

export async function insertRun(run: Omit<Run, "id">): Promise<Run> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("runs")
    .insert({
      distance_km: run.distanceKm,
      duration_seconds: run.durationSeconds,
      date: run.date,
      notes: run.notes ?? null,
      cadence: run.cadence ?? null,
      stride_length_cm: run.strideLengthCm ?? null,
    } as never)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return rowToRun(data as unknown as RunRow)
}
