import type { BackgroundGeolocationPlugin, SessionData } from "./background-geolocation"

export class WebBackgroundGeolocation implements BackgroundGeolocationPlugin {
  private watchId: number | null = null
  private locations: { lat: number; lng: number; timestamp: number; accuracy: number }[] = []
  private storageKey = "metricrun_native_session"

  async startTracking(): Promise<void> {
    this.locations = []

    if (!navigator.geolocation) {
      throw new Error("Geolocation not available")
    }

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this.locations.push({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: pos.timestamp,
          accuracy: pos.coords.accuracy,
        })
        localStorage.setItem(this.storageKey, JSON.stringify(this.locations))
      },
      (err) => console.error("Web tracking error:", err),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 },
    )
  }

  async stopTracking(): Promise<void> {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId)
      this.watchId = null
    }
  }

  async getSession(): Promise<SessionData> {
    const stored = localStorage.getItem(this.storageKey)
    if (stored) {
      this.locations = JSON.parse(stored)
    }
    return { locations: this.locations }
  }

  async clearSession(): Promise<void> {
    this.locations = []
    localStorage.removeItem(this.storageKey)
  }
}
