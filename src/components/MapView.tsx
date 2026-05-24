"use client"

import { useEffect, useRef } from "react"
import type { RoutePoint } from "@/lib/types"
import { smoothPoints } from "@/lib/gps-utils"

interface MapViewProps {
  positions: RoutePoint[]
}

const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>, &copy; <a href="https://carto.com/">CARTO</a>'

export default function MapView({ positions }: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null)
  const polylineRef = useRef<L.Polyline | null>(null)
  const markerRef = useRef<L.CircleMarker | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    let map: L.Map | null = null
    let polyline: L.Polyline | null = null
    let marker: L.CircleMarker | null = null
    let tileLayer: L.TileLayer | null = null

    async function init() {
      const L = await import("leaflet")
      await import("leaflet/dist/leaflet.css")

      if (!containerRef.current || initializedRef.current) return
      initializedRef.current = true

      map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: false,
      }).setView([40.4168, -3.7038], 15)

      tileLayer = L.tileLayer(DARK_TILES, {
        attribution: ATTRIBUTION,
        subdomains: "abcd",
      }).addTo(map)

      polyline = L.polyline([], {
        color: "#22d3ee",
        weight: 4,
        opacity: 0.9,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map)

      marker = L.circleMarker([40.4168, -3.7038], {
        radius: 8,
        color: "#22d3ee",
        fillColor: "#22d3ee",
        fillOpacity: 1,
        weight: 2,
      }).addTo(map)

      mapRef.current = map
      polylineRef.current = polyline
      markerRef.current = marker
    }

    init()

    return () => {
      initializedRef.current = false
      if (map) {
        map.remove()
        mapRef.current = null
        polylineRef.current = null
        markerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const polyline = polylineRef.current
    const marker = markerRef.current
    if (!map || !polyline || !marker) return

    if (positions.length === 0) return

    const smoothed = smoothPoints(positions)
    const latLngs = smoothed.map((p) => [p.lat, p.lng] as [number, number])

    polyline.setLatLngs(latLngs)

    const last = latLngs[latLngs.length - 1]
    marker.setLatLng(last)

    if (positions.length < 3) {
      map.setView(last, 16)
    } else {
      map.panTo(last, { animate: true, duration: 0.3 })
    }
  }, [positions])

  return <div ref={containerRef} className="h-full w-full" />
}
