import { createWorker } from "tesseract.js"

export interface ParsedRunData {
  name?: string
  distanceKm?: number
  durationSeconds?: number
  avgHeartRate?: number
}

function parseNumber(text: string): number | undefined {
  const cleaned = text.replace(",", ".").replace(/[^0-9.]/g, "")
  const num = parseFloat(cleaned)
  return isNaN(num) ? undefined : num
}

function parseTime(text: string): number | undefined {
  const patterns = [
    /(\d{1,2}):(\d{2}):(\d{2})/,
    /(\d{1,2}):(\d{2})/,
    /(\d{1,2})h\s*(\d{1,2})m/,
    /(\d{1,2})'(\d{2})"/,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (!m) continue
    if (m.length === 4) {
      return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3])
    }
    if (m.length === 3 && text.includes("h")) {
      return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60
    }
    if (m.length === 3 && !text.includes(":")) {
      return parseInt(m[1]) * 60 + parseInt(m[2])
    }
    if (m.length === 3) {
      return parseInt(m[1]) * 60 + parseInt(m[2])
    }
  }
  return undefined
}

function parseDurationFromPaceAndDistance(
  paceMinPerKm: number,
  distanceKm: number
): number | undefined {
  if (!paceMinPerKm || !distanceKm) return undefined
  return Math.round(paceMinPerKm * 60 * distanceKm)
}

function findLineContaining(lines: string[], keywords: string[]): string | undefined {
  return lines.find((l) =>
    keywords.some((k) => l.toLowerCase().includes(k.toLowerCase()))
  )
}

function parsePace(text: string): number | undefined {
  const patterns = [
    /(\d+)[:'](\d{2})\s*\/?\s*km/i,
    /(\d+)[:'](\d{2})\s*min/i,
    /ritmo.*?(\d+)[:'](\d{2})/i,
    /pace.*?(\d+)[:'](\d{2})/i,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) {
      const minutes = parseInt(m[1])
      const seconds = parseInt(m[2])
      return minutes + seconds / 60
    }
  }
  return undefined
}

export function parseRunText(text: string): ParsedRunData {
  const lines = text.split("\n").filter(Boolean)
  const result: ParsedRunData = {}

  const carreraLine = findLineContaining(lines, ["carrera", "running", "race", "run", "entreno", "training"])
  if (carreraLine) {
    const clean = carreraLine.replace(/^(carrera|running|race|run|entreno|training)[:\s]*/i, "").trim()
    if (clean.length > 0 && clean.length < 60) {
      result.name = clean
    }
  }

  const distLine = findLineContaining(lines, ["distancia", "distance", "km", "dist"])
  if (distLine) {
    const num = parseFloat(distLine.replace(",", ".").match(/[\d,]+\.?[\d,]*/)?.[0] ?? "")
    if (!isNaN(num) && num > 0 && num < 200) {
      result.distanceKm = Math.round(num * 100) / 100
    }
  }

  if (!result.distanceKm) {
    for (const line of lines) {
      const m = line.match(/([\d]+[.,]\d+)\s*km/i)
      if (m) {
        const num = parseFloat(m[1].replace(",", "."))
        if (num > 0 && num < 200) {
          result.distanceKm = Math.round(num * 100) / 100
          break
        }
      }
    }
  }

  const timeLine = findLineContaining(lines, ["tiempo", "time", "duration", "duración", "clock"])
  if (timeLine) {
    const t = parseTime(timeLine)
    if (t) result.durationSeconds = t
  }

  if (!result.durationSeconds) {
    for (const line of lines) {
      const t = parseTime(line)
      if (t && t > 60 && t < 86400) {
        result.durationSeconds = t
        break
      }
    }
  }

  const hrmKeywords = ["ppm", "bpm", "fc:", "hr:", "heart", "cardiac", "pulso", "frecuencia"]
  const hrmLine = findLineContaining(lines, hrmKeywords)
  if (hrmLine) {
    const m = hrmLine.match(/(\d{2,3})\s*(?:ppm|bpm)?/i)
    if (m) {
      const val = parseInt(m[1])
      if (val > 50 && val < 230) result.avgHeartRate = val
    }
  }

  if (!result.avgHeartRate) {
    for (const line of lines) {
      const m = line.match(/(\d{2,3})\s*(?:ppm|bpm)/i)
      if (m) {
        const val = parseInt(m[1])
        if (val > 50 && val < 230) {
          result.avgHeartRate = val
          break
        }
      }
    }
  }

  const paceLine = findLineContaining(lines, ["ritmo", "pace", "min/km", "/km"])
  if (paceLine) {
    const pace = parsePace(paceLine)
    if (pace && pace > 2 && pace < 15 && result.durationSeconds && result.distanceKm) {
    }
    if (pace && pace > 2 && pace < 15 && !result.durationSeconds && result.distanceKm) {
      const dur = parseDurationFromPaceAndDistance(pace, result.distanceKm)
      if (dur) result.durationSeconds = dur
    }
  }

  if (!result.durationSeconds && result.distanceKm) {
    const paceVal = parsePace(text)
    if (paceVal && paceVal > 2 && paceVal < 15) {
      const dur = parseDurationFromPaceAndDistance(paceVal, result.distanceKm)
      if (dur) result.durationSeconds = dur
    }
  }

  return result
}

export async function recognizeRunFromImage(
  imageData: string
): Promise<{ text: string; parsed: ParsedRunData }> {
  const worker = await createWorker("spa")
  const { data } = await worker.recognize(imageData)
  await worker.terminate()

  const text = data.text
  const parsed = parseRunText(text)
  return { text, parsed }
}
