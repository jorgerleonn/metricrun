"use client"

import { useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { Play, Pause, Square, Route, Loader2, AlertCircle, ChevronLeft } from "lucide-react"
import { useRunTracker } from "@/hooks/useRunTracker"
import { insertRun } from "@/lib/supabase-queries"
import { formatElapsed, formatPace } from "@/lib/gps-utils"
import type { Run } from "@/lib/types"

const MapView = dynamic(
  () => import("@/components/MapView"),
  { ssr: false, loading: () => (
    <div className="flex h-full items-center justify-center bg-neutral-950">
      <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
    </div>
  )}
)

export default function RunTracker() {
  const router = useRouter()
  const { user } = useUser()
  const { status, positions, error, liveMetrics, hasSavedSession, start, restore, pause, resume, stop, getFinishedResult } = useRunTracker()
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const handleStart = useCallback(() => {
    start()
  }, [start])

  const handleRestore = useCallback(() => {
    restore()
  }, [restore])

  const handlePause = useCallback(() => {
    pause()
  }, [pause])

  const handleResume = useCallback(() => {
    resume()
  }, [resume])

  const handleStopTracking = useCallback(() => {
    stop()
  }, [stop])

  const handleSave = useCallback(async () => {
    if (!user) return

    const result = getFinishedResult()
    if (!result || result.points.length === 0) {
      setSaveError("No hay datos de ruta para guardar")
      return
    }

    setSaving(true)
    setSaveError(null)

    try {
      const run: Omit<Run, "id"> = {
        distanceKm: result.totalDistanceKm,
        durationSeconds: result.totalDurationSeconds,
        date: new Date().toISOString().split("T")[0],
        routeData: {
          points: result.points,
          totalDistanceKm: result.totalDistanceKm,
          totalDurationSeconds: result.totalDurationSeconds,
        },
      }

      await insertRun(run, user.id)
      setSaved(true)
    } catch (err) {
      console.error("Error saving run:", err)
      setSaveError("Error al guardar. Intenta de nuevo.")
      setSaving(false)
    }
  }, [user, getFinishedResult])

  const handleBack = useCallback(() => {
    router.push("/")
  }, [router])

  if (saved) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-6 bg-neutral-950 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/20">
          <Route className="h-8 w-8 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Carrera guardada</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {liveMetrics.distanceKm.toFixed(2)} km &middot;{" "}
            {formatElapsed(liveMetrics.elapsedSeconds)}
          </p>
        </div>
        <button
          onClick={handleBack}
          className="inline-flex h-10 items-center justify-center rounded-md bg-cyan-500 px-6 text-sm font-medium text-white transition-colors hover:bg-cyan-600"
        >
          Volver al Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-neutral-950">
      <MapView positions={positions} />

      {status === "idle" && !hasSavedSession && (
        <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center gap-6 bg-neutral-950/60 backdrop-blur-sm">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-cyan-400/50">
            <Route className="h-10 w-10 text-cyan-400" />
          </div>
          <p className="text-lg font-medium">Prepara tu próxima carrera</p>
          <p className="text-sm text-muted-foreground">Activa el GPS para empezar a trazar tu ruta</p>
          <button
            onClick={handleStart}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500 shadow-lg shadow-cyan-500/30 transition-all hover:scale-105 active:scale-95"
          >
            <Play className="ml-1 h-8 w-8 text-white" />
          </button>
        </div>
      )}

      {status === "idle" && hasSavedSession && (
        <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center gap-6 bg-neutral-950/60 backdrop-blur-sm px-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-amber-400/50">
            <Route className="h-10 w-10 text-amber-400" />
          </div>
          <p className="text-lg font-medium">Carrera en pausa</p>
          <p className="text-center text-sm text-muted-foreground">
          Tienes una carrera guardada localmente. ¿Quieres continuar o empezar una nueva?
          </p>
          <div className="flex gap-4">
            <button
              onClick={handleRestore}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-amber-500 px-8 text-sm font-medium text-white shadow-lg transition-all hover:bg-amber-600 active:scale-95"
            >
              <Play className="h-5 w-5" />
              Continuar
            </button>
            <button
              onClick={handleStart}
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/10 px-8 text-sm font-medium transition-colors hover:bg-white/5"
            >
              Nueva
            </button>
          </div>
        </div>
      )}

      {status === "requesting" && (
        <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center gap-4 bg-neutral-950/60 backdrop-blur-sm">
          <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
          <p className="text-sm text-muted-foreground">Obteniendo ubicación...</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center gap-4 bg-neutral-950/60 backdrop-blur-sm px-6">
          <AlertCircle className="h-10 w-10 text-red-400" />
          <p className="text-center text-sm text-red-400">{error}</p>
          <button
            onClick={handleBack}
            className="inline-flex h-10 items-center justify-center rounded-md bg-muted px-6 text-sm font-medium transition-colors hover:bg-muted/80"
          >
            Volver
          </button>
        </div>
      )}

      {(status === "recording" || status === "paused") && (
        <>
          <div className="absolute left-0 right-0 top-0 z-[1000] p-4">
            <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-neutral-950/80 px-6 py-4 backdrop-blur-xl">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tiempo</p>
                  <p className="mt-1 text-xl font-bold tabular-nums">{formatElapsed(liveMetrics.elapsedSeconds)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Distancia</p>
                  <p className="mt-1 text-xl font-bold tabular-nums">
                    {liveMetrics.distanceKm.toFixed(2)}
                    <span className="text-xs font-normal text-muted-foreground"> km</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Ritmo</p>
                  <p className="mt-1 text-xl font-bold tabular-nums">
                    {formatPace(liveMetrics.currentPaceMinPerKm)}
                    <span className="text-xs font-normal text-muted-foreground"> /km</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {status === "recording" && (
            <div className="absolute left-1/2 bottom-8 z-[1000] flex -translate-x-1/2 items-center gap-4">
              <button
                onClick={handlePause}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 backdrop-blur-xl transition-all hover:bg-white/20 active:scale-95"
              >
                <Pause className="h-6 w-6 text-white" />
              </button>
            </div>
          )}

          {status === "paused" && (
            <div className="absolute left-1/2 bottom-8 z-[1000] flex -translate-x-1/2 items-center gap-6">
              <button
                onClick={handleResume}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500 shadow-lg shadow-cyan-500/30 transition-all hover:scale-105 active:scale-95"
              >
                <Play className="ml-1 h-6 w-6 text-white" />
              </button>
              <button
                onClick={handleStopTracking}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/80 backdrop-blur-xl transition-all hover:bg-red-500 active:scale-95"
              >
                <Square className="h-6 w-6 text-white" />
              </button>
            </div>
          )}
        </>
      )}

      {status === "finished" && !saved && (
        <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center gap-6 bg-neutral-950/60 backdrop-blur-sm px-6">
          <div className="rounded-2xl border border-white/10 bg-neutral-950/80 px-8 py-6 backdrop-blur-xl">
            <div className="grid grid-cols-3 gap-8 text-center">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Distancia</p>
                <p className="mt-1 text-2xl font-bold">{liveMetrics.distanceKm.toFixed(2)} km</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tiempo</p>
                <p className="mt-1 text-2xl font-bold">{formatElapsed(liveMetrics.elapsedSeconds)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Ritmo</p>
                <p className="mt-1 text-2xl font-bold">{formatPace(liveMetrics.currentPaceMinPerKm)}</p>
              </div>
            </div>
          </div>

          {saveError && (
            <p className="text-sm text-red-400">{saveError}</p>
          )}

          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cyan-500 px-6 text-sm font-medium text-white shadow-lg transition-colors hover:bg-cyan-600 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? "Guardando..." : "Guardar Carrera"}
            </button>
            <button
              onClick={handleBack}
              disabled={saving}
              className="inline-flex h-10 items-center justify-center rounded-md border border-white/10 px-6 text-sm font-medium transition-colors hover:bg-white/5 disabled:opacity-50"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      <button
        onClick={handleBack}
        className="absolute left-4 top-4 z-[1000] flex h-9 w-9 items-center justify-center rounded-full bg-neutral-950/60 backdrop-blur-sm transition-colors hover:bg-neutral-900"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
    </div>
  )
}
