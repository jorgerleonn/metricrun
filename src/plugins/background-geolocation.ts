import { registerPlugin } from "@capacitor/core"

export interface TrackedLocation {
  lat: number
  lng: number
  timestamp: number
  accuracy: number
}

export interface SessionData {
  locations: TrackedLocation[]
}

export interface BackgroundGeolocationPlugin {
  startTracking(): Promise<void>
  stopTracking(): Promise<void>
  getSession(): Promise<SessionData>
  clearSession(): Promise<void>
}

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>("BackgroundGeolocation", {
  web: () => import("./web-background-geolocation").then((m) => new m.WebBackgroundGeolocation()),
})

export { BackgroundGeolocation }
