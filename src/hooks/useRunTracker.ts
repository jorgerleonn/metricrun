"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import type { RoutePoint, TrackerStatus, LiveMetrics } from "@/lib/types"
import { isGpsPointValid, calculateTotalDistance, calculatePace } from "@/lib/gps-utils"
import { loadSession, saveSession, clearSession } from "@/lib/tracker-storage"

export function useRunTracker() {
  const [status, setStatus] = useState<TrackerStatus>("idle")
  const [positions, setPositions] = useState<RoutePoint[]>([])
  const [error, setError] = useState<string | null>(null)
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics>({
    elapsedSeconds: 0,
    distanceKm: 0,
    currentPaceMinPerKm: null,
  })
  const [hasSavedSession, setHasSavedSession] = useState(false)
  const savedSessionRef = useRef<ReturnType<typeof loadSession>>(null)

  const watchIdRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const elapsedPausedRef = useRef(0)
  const pauseStartRef = useRef<number | null>(null)
  const wakeLockRef = useRef<any>(null)
  const positionsRef = useRef<RoutePoint[]>([])
  const lastValidRef = useRef<RoutePoint | null>(null)
  const paceWindowRef = useRef<RoutePoint[]>([])
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const checkpointRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const smoothCounterRef = useRef(0)
  const finishedResultRef = useRef<{
    points: RoutePoint[]
    totalDistanceKm: number
    totalDurationSeconds: number
  } | null>(null)

  const storeCheckpoint = useCallback(() => {
    const s = status
    if (s !== "recording" && s !== "paused") return
    if (!startTimeRef.current) return

    saveSession({
      positions: positionsRef.current,
      startTime: startTimeRef.current,
      elapsedPaused: elapsedPausedRef.current,
      status: s as "recording" | "paused",
      updatedAt: Date.now(),
    })
  }, [status])

  const startCheckpointInterval = useCallback(() => {
    storeCheckpoint()
    checkpointRef.current = setInterval(storeCheckpoint, 5000)
  }, [storeCheckpoint])

  const stopCheckpointInterval = useCallback(() => {
    if (checkpointRef.current != null) {
      clearInterval(checkpointRef.current)
      checkpointRef.current = null
    }
  }, [])

  const clearWatch = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  const stopTicker = useCallback(() => {
    if (tickRef.current != null) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
  }, [])

  const requestWakeLock = useCallback(async () => {
    if ("wakeLock" in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request("screen")
      } catch {
        // Wake lock not available
      }
    }
  }, [])

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {})
      wakeLockRef.current = null
    }
  }, [])

  const tick = useCallback(() => {
    if (!startTimeRef.current) return
    const now = Date.now()
    const total = now - startTimeRef.current - elapsedPausedRef.current
    const elapsedSeconds = total / 1000
    const distanceKm = calculateTotalDistance(positionsRef.current)

    let currentPaceMinPerKm: number | null = null
    const windowPoints = paceWindowRef.current
    if (windowPoints.length >= 2) {
      const windowDist = calculateTotalDistance(windowPoints)
      const windowTime = (windowPoints[windowPoints.length - 1].timestamp - windowPoints[0].timestamp) / 1000
      currentPaceMinPerKm = calculatePace(windowDist, windowTime)
    }

    setLiveMetrics({ elapsedSeconds, distanceKm, currentPaceMinPerKm })
  }, [])

  const startTicker = useCallback(() => {
    tick()
    tickRef.current = setInterval(tick, 1000)
  }, [tick])

  const startWatching = useCallback(() => {
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const point: RoutePoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: pos.timestamp,
          accuracy: pos.coords.accuracy ?? undefined,
        }

        if (!isGpsPointValid(point, lastValidRef.current)) return

        lastValidRef.current = point
        smoothCounterRef.current++

        if (smoothCounterRef.current % 2 === 0) return

        const updated = [...positionsRef.current, point]
        positionsRef.current = updated
        paceWindowRef.current = [...paceWindowRef.current, point].slice(-10)
        setPositions(updated)
      },
      () => {},
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    )
  }, [])

  const start = useCallback(() => {
    setError(null)
    setStatus("requesting")

    if (!navigator.geolocation) {
      setError("Tu navegador no soporta geolocalización")
      setStatus("error")
      return
    }

    clearSession()
    savedSessionRef.current = null
    setHasSavedSession(false)
    requestWakeLock()

    const now = Date.now()
    startTimeRef.current = now
    elapsedPausedRef.current = 0
    positionsRef.current = []
    lastValidRef.current = null
    paceWindowRef.current = []
    smoothCounterRef.current = 0
    finishedResultRef.current = null

    startWatching()

    setStatus("recording")
    startTicker()
    startCheckpointInterval()
  }, [requestWakeLock, startTicker, startCheckpointInterval, startWatching])

  const restore = useCallback(() => {
    const session = savedSessionRef.current
    if (!session) return

    setError(null)
    setHasSavedSession(false)
    savedSessionRef.current = null
    requestWakeLock()

    startTimeRef.current = session.startTime
    elapsedPausedRef.current = session.elapsedPaused
    positionsRef.current = [...session.positions]
    lastValidRef.current =
      session.positions.length > 0
        ? session.positions[session.positions.length - 1]
        : null
    paceWindowRef.current = []
    smoothCounterRef.current = 0
    finishedResultRef.current = null

    setPositions([...session.positions])

    startWatching()
    setStatus("recording")
    startTicker()
    startCheckpointInterval()
  }, [requestWakeLock, startTicker, startCheckpointInterval, startWatching])

  const pause = useCallback(() => {
    if (status !== "recording") return
    clearWatch()
    stopTicker()
    stopCheckpointInterval()
    pauseStartRef.current = Date.now()

    storeCheckpoint()
    setStatus("paused")
  }, [status, clearWatch, stopTicker, stopCheckpointInterval, storeCheckpoint])

  const resume = useCallback(() => {
    if (status !== "paused") return
    if (pauseStartRef.current != null) {
      elapsedPausedRef.current += Date.now() - pauseStartRef.current
      pauseStartRef.current = null
    }

    startWatching()
    setStatus("recording")
    startTicker()
    startCheckpointInterval()
  }, [status, startTicker, startCheckpointInterval, startWatching])

  const stop = useCallback(() => {
    clearWatch()
    stopTicker()
    stopCheckpointInterval()
    releaseWakeLock()
    pauseStartRef.current = null
    clearSession()

    const totalDistanceKm = calculateTotalDistance(positionsRef.current)
    const totalDurationMs = Date.now() - (startTimeRef.current ?? Date.now()) - elapsedPausedRef.current
    const totalDurationSeconds = Math.round(totalDurationMs / 1000)

    const result = {
      points: [...positionsRef.current],
      totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
      totalDurationSeconds,
    }

    finishedResultRef.current = result
    setStatus("finished")

    return result
  }, [clearWatch, stopTicker, stopCheckpointInterval, releaseWakeLock])

  const getFinishedResult = useCallback(() => {
    return finishedResultRef.current
  }, [])

  useEffect(() => {
    const session = loadSession()
    if (session) {
      savedSessionRef.current = session
      setHasSavedSession(true)
    }
  }, [])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        storeCheckpoint()
      }
    }

    const handleBeforeUnload = () => {
      storeCheckpoint()
    }

    document.addEventListener("visibilitychange", handleVisibility)
    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility)
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [storeCheckpoint])

  useEffect(() => {
    return () => {
      clearWatch()
      stopTicker()
      stopCheckpointInterval()
      releaseWakeLock()
    }
  }, [clearWatch, stopTicker, stopCheckpointInterval, releaseWakeLock])

  return {
    status,
    positions,
    error,
    liveMetrics,
    hasSavedSession,
    start,
    restore,
    pause,
    resume,
    stop,
    getFinishedResult,
  }
}
