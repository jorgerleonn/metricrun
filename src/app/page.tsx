"use client"

import { useEffect, useState, useCallback } from "react"
import { useUser } from "@clerk/nextjs"
import { Route, TrendingUp, Calendar, Loader2 } from "lucide-react"
import { MetricCard } from "@/components/MetricCard"
import { RunListItem } from "@/components/RunListItem"
import { AddRunModal } from "@/components/AddRunModal"
import { WeeklyChart } from "@/components/WeeklyChart"
import { fetchRuns, insertRun } from "@/lib/supabase-queries"
import { formatPace } from "@/lib/helpers"
import type { Run, WeeklyStats, DailyDistance } from "@/lib/types"

function getWeeklyStats(runs: Run[]): WeeklyStats {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekRuns = runs.filter((r) => new Date(r.date) >= weekAgo)

  const totalDistanceKm = weekRuns.reduce((sum, r) => sum + r.distanceKm, 0)
  const totalDuration = weekRuns.reduce((sum, r) => sum + r.durationSeconds, 0)
  const totalRuns = weekRuns.length
  const averagePaceMinPerKm =
    totalDistanceKm > 0 ? totalDuration / 60 / totalDistanceKm : 0

  return { totalDistanceKm, averagePaceMinPerKm, totalRuns }
}

function getDailyDistances(runs: Run[]): DailyDistance[] {
  const days: DailyDistance[] = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split("T")[0]
    const dayRuns = runs.filter((r) => r.date === dateStr)
    const distanceKm = dayRuns.reduce((sum, r) => sum + r.distanceKm, 0)
    days.push({
      date: dateStr,
      distanceKm: Math.round(distanceKm * 100) / 100,
      dayLabel: date
        .toLocaleDateString("es-ES", { weekday: "short" })
        .slice(0, 3),
    })
  }
  return days
}

export default function DashboardPage() {
  const { isLoaded, isSignedIn, user } = useUser()
  const [runs, setRuns] = useState<Run[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn || !user) return

    fetchRuns(user.id)
      .then(setRuns)
      .catch((err) => console.error("Error fetching runs:", err))
      .finally(() => setLoading(false))
  }, [isLoaded, isSignedIn, user])

  const handleAddRun = useCallback(async (run: Omit<Run, "id">) => {
    if (!user) return
    try {
      const inserted = await insertRun(run, user.id)
      setRuns((prev) => [inserted, ...prev])
    } catch (err) {
      console.error("Error inserting run:", err)
    }
  }, [user])

  if (!isLoaded || loading) {
    return (
      <div className="mx-auto flex max-w-4xl items-center justify-center px-4 py-32">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-center px-4 py-32 text-center">
        <h1 className="mb-2 text-2xl font-bold">MetricRun</h1>
        <p className="mb-6 text-muted-foreground">
          Inicia sesión para registrar tus carreras
        </p>
        <a
          href="/sign-in"
          className="inline-flex h-10 items-center justify-center rounded-md bg-cyan-500 px-6 text-sm font-medium text-white shadow transition-colors hover:bg-cyan-600"
        >
          Iniciar Sesión
        </a>
      </div>
    )
  }

  const stats = getWeeklyStats(runs)
  const dailyData = getDailyDistances(runs)

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">MetricRun</h1>
          <p className="text-sm text-muted-foreground">
            Tus entrenamientos de running
          </p>
        </div>
        <div className="flex items-center gap-4">
          <AddRunModal onAddRun={handleAddRun} />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-7 w-7 overflow-hidden rounded-full bg-muted">
              {user.imageUrl && (
                <img
                  src={user.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <span className="hidden sm:inline">{user.firstName || user.emailAddresses[0]?.emailAddress}</span>
          </div>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Kilómetros"
          value={`${stats.totalDistanceKm.toFixed(1)} km`}
          subtext="Esta semana"
          icon={<Route className="h-5 w-5" />}
          accent
        />
        <MetricCard
          label="Ritmo Medio"
          value={formatPace(stats.averagePaceMinPerKm)}
          subtext="Por kilómetro"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          label="Salidas"
          value={`${stats.totalRuns}`}
          subtext="Esta semana"
          icon={<Calendar className="h-5 w-5" />}
        />
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Distancia (últimos 7 días)
        </h2>
        <WeeklyChart data={dailyData} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Historial Reciente
        </h2>
        <div className="space-y-2">
          {runs.map((run) => (
            <RunListItem key={run.id} run={run} />
          ))}
        </div>
      </section>
    </div>
  )
}
