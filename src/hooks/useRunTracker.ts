"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import type { RoutePoint, TrackerStatus, LiveMetrics } from "@/lib/types"
import { isGpsPointValid, calculateTotalDistance, calculatePace } from "@/lib/gps-utils"

const SMOOTH_DISTANCE_M = 0.008

export function useRunTracker() {
  const [status, setStatus] = useState<TrackerStatus>("idle")
  const [positions, setPositions] = useState<RoutePoint[]>([])
  const [error, setError] = useState<string | null>(null)
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics>({
    elapsedSeconds: 0,
    distanceKm: 0,
    currentPaceMinPerKm: null,
  })

  const watchIdRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const elapsedPausedRef = useRef(0)
  const pauseStartRef = useRef<number | null>(null)
  const wakeLockRef = useRef<any>(null)
  const positionsRef = useRef<RoutePoint[]>([])
  const lastValidRef = useRef<RoutePoint | null>(null)
  const paceWindowRef = useRef<RoutePoint[]>([])
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const smoothCounterRef = useRef(0)

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
        // Wake lock not available, silently continue
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

  const start = useCallback(() => {
    setError(null)
    setStatus("requesting")

    if (!navigator.geolocation) {
      setError("Tu navegador no soporta geolocalización")
      setStatus("error")
      return
    }

    requestWakeLock()

    const now = Date.now()
    startTimeRef.current = now
    elapsedPausedRef.current = 0
    positionsRef.current = []
    lastValidRef.current = null
    paceWindowRef.current = []
    smoothCounterRef.current = 0

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
      (err) => {
        setError(`Error de GPS: ${err.message}`)
        setStatus("error")
        clearWatch()
        stopTicker()
        releaseWakeLock()
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    )

    setStatus("recording")
    startTicker()
  }, [requestWakeLock, clearWatch, stopTicker, releaseWakeLock, startTicker])

  const pause = useCallback(() => {
    if (status !== "recording") return
    clearWatch()
    stopTicker()
    pauseStartRef.current = Date.now()
    setStatus("paused")
  }, [status, clearWatch, stopTicker])

  const resume = useCallback(() => {
    if (status !== "paused") return
    if (pauseStartRef.current != null) {
      elapsedPausedRef.current += Date.now() - pauseStartRef.current
      pauseStartRef.current = null
    }

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

    setStatus("recording")
    startTicker()
  }, [status, startTicker])

  const stop = useCallback(() => {
    clearWatch()
    stopTicker()
    releaseWakeLock()
    pauseStartRef.current = null

    const totalDistanceKm = calculateTotalDistance(positionsRef.current)
    const totalDurationMs = Date.now() - (startTimeRef.current ?? Date.now()) - elapsedPausedRef.current
    const totalDurationSeconds = Math.round(totalDurationMs / 1000)

    setStatus("finished")

    return {
      points: positionsRef.current,
      totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
      totalDurationSeconds,
    }
  }, [clearWatch, stopTicker, releaseWakeLock])

  useEffect(() => {
    return () => {
      clearWatch()
      stopTicker()
      releaseWakeLock()
    }
  }, [clearWatch, stopTicker, releaseWakeLock])

  return {
    status,
    positions,
    error,
    liveMetrics,
    start,
    pause,
    resume,
    stop,
  }
}
