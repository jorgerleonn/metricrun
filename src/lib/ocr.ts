import { createWorker } from "tesseract.js"

export interface ParsedRunData {
  name?: string
  distanceKm?: number
  durationSeconds?: number
  avgHeartRate?: number
  paceMinPerKm?: number
}

function extractNumbers(text: string): number[] {
  const normalized = text.replace(/,/g, ".")
  const matches = normalized.match(/\d+\.?\d*/g) ?? []
  return matches.map(Number).filter((n) => !isNaN(n))
}

function parseTimeFromString(text: string): number | undefined {
  const patterns = [
    { re: /(\d{1,2}):(\d{2}):(\d{2})/, fn: (m: RegExpMatchArray) => parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]) },
    { re: /(\d{1,2}):(\d{2})/, fn: (m: RegExpMatchArray) => parseInt(m[1]) * 60 + parseInt(m[2]) },
    { re: /(\d{1,2})h\s*(\d{1,2})m/, fn: (m: RegExpMatchArray) => parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 },
    { re: /(\d{1,2})h\s*(\d{1,2})min/, fn: (m: RegExpMatchArray) => parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 },
    { re: /(\d{1,2})'(\d{2})"/, fn: (m: RegExpMatchArray) => parseInt(m[1]) * 60 + parseInt(m[2]) },
    { re: /(\d{1,2})'(\d{2})/, fn: (m: RegExpMatchArray) => parseInt(m[1]) * 60 + parseInt(m[2]) },
    { re: /(\d{1,3})\s*min/, fn: (m: RegExpMatchArray) => parseInt(m[1]) * 60 },
  ]
  for (const { re, fn } of patterns) {
    const m = text.match(re)
    if (m) {
      const val = fn(m)
      if (val > 0 && val < 100000) return val
    }
  }
  return undefined
}

function parsePaceFromString(text: string): number | undefined {
  const patterns = [
    { re: /(\d+)[:'](\d{2})\s*\/?\s*km/i },
    { re: /(\d+)[:'](\d{2})\s*min/i },
    { re: /ritmo.*?(\d+)[:'](\d{2})/i },
    { re: /pace.*?(\d+)[:'](\d{2})/i },
  ]
  for (const { re } of patterns) {
    const m = text.match(re)
    if (m) return parseInt(m[1]) + parseInt(m[2]) / 60
  }
  return undefined
}

function cleanLine(line: string): string {
  return line.trim().replace(/[|lI!]/g, "1").replace(/[OoQ]/g, "0").replace(/[S]/g, "5")
}

const COMMON_RUN_TYPES = [
  "carrera", "running", "run", "race", "entreno", "training",
  "media maratón", "media maraton", "half marathon",
  "maratón", "maraton", "marathon",
  "cros", "cross", "trail", "ultra",
  "intervalos", "intervals", "series", "repeticiones",
  "rodaje", "recuperación", "recuperacion",
  "trote", "calentamiento", "vuelta a la calma",
  "10k", "10km", "5k", "5km",
  "fartlek",
]

function extractName(lines: string[]): string | undefined {
  const firstLine = lines[0]
  if (!firstLine) return undefined

  const cleaned = firstLine.trim()
  if (cleaned.length === 0 || cleaned.length > 60) return undefined

  const isJustMetric = /^[\d.:,/km\s]+$/i.test(cleaned)
  if (isJustMetric) return undefined

  const hasKeyword = COMMON_RUN_TYPES.some((k) => cleaned.toLowerCase().includes(k))
  if (hasKeyword) {
    const withoutPrefix = cleaned.replace(new RegExp(`^(${COMMON_RUN_TYPES.join("|")})[:\s-]*`, "i"), "").trim()
    if (withoutPrefix.length > 0) return withoutPrefix.charAt(0).toUpperCase() + withoutPrefix.slice(1)
    const titleCase = cleaned.replace(/\b\w/g, (c) => c.toUpperCase())
    return titleCase
  }

  const hasOnlyLetters = /^[\p{L}\s]+$/u.test(cleaned)
  if (hasOnlyLetters && cleaned.length > 2) {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }

  return undefined
}

function extractDistance(lines: string[], fullText: string): number | undefined {
  const distKeywords = ["distancia", "distance", "km", "dist", "kms", "kilómetros", "kilometros"]

  for (const line of lines) {
    const hasKeyword = distKeywords.some((k) => line.toLowerCase().includes(k))
    if (!hasKeyword) continue
    const nums = extractNumbers(line)
    for (const n of nums) {
      if (n > 0.5 && n < 200) return Math.round(n * 100) / 100
    }
  }

  for (const line of lines) {
    const m = line.match(/([\d]+[.,]?\d*)\s*kr?m?/i)
    if (m) {
      const num = parseFloat(m[1].replace(",", "."))
      if (!isNaN(num) && num > 0.5 && num < 200) return Math.round(num * 100) / 100
    }
  }

  const nums = extractNumbers(fullText)
  for (const n of nums) {
    if (n > 2 && n < 100) return Math.round(n * 100) / 100
  }

  return undefined
}

function extractTime(lines: string[], fullText: string): number | undefined {
  const timeKeywords = ["tiempo", "time", "duration", "duración", "duracion", "clock", "chrono", "transcurrido"]

  for (const line of lines) {
    const hasKeyword = timeKeywords.some((k) => line.toLowerCase().includes(k))
    if (!hasKeyword) continue
    const t = parseTimeFromString(line)
    if (t && t > 30 && t < 100000) return t
  }

  for (const line of lines) {
    const t = parseTimeFromString(line)
    if (t && t > 30 && t < 100000) return t
  }

  const fullTime = parseTimeFromString(fullText)
  if (fullTime && fullTime > 30 && fullTime < 100000) return fullTime

  return undefined
}

function extractHeartRate(lines: string[], _fullText: string): number | undefined {
  const hrKeywords = ["ppm", "bpm", "fc:", "hr:", "heart", "cardiac", "pulso", "frecuencia", "pulsaciones", "latidos"]

  for (const line of lines) {
    const hasKeyword = hrKeywords.some((k) => line.toLowerCase().includes(k))
    if (!hasKeyword) continue
    const m = line.match(/(\d{2,3})\s*(?:ppm|bpm)?/i)
    if (m) {
      const val = parseInt(m[1])
      if (val > 40 && val < 240) return val
    }
  }

  for (const line of lines) {
    const m = line.match(/(\d{2,3})\s*(?:ppm|bpm|lpm)/i)
    if (m) {
      const val = parseInt(m[1])
      if (val > 40 && val < 240) return val
    }
  }

  for (const line of lines) {
    if (/fc|hr|pulso|card|ppm|bpm/i.test(line)) {
      const nums = extractNumbers(line)
      for (const n of nums) {
        if (n > 40 && n < 240) return n
      }
    }
  }

  return undefined
}

export function parseRunText(text: string): ParsedRunData {
  const rawLines = text.split("\n")
  const lines = rawLines.map(cleanLine).filter(Boolean)
  const fullText = lines.join("\n")

  const result: ParsedRunData = {}

  result.name = extractName(lines)
  result.distanceKm = extractDistance(lines, fullText)
  result.durationSeconds = extractTime(lines, fullText)
  result.avgHeartRate = extractHeartRate(lines, fullText)

  if (result.distanceKm && result.durationSeconds) {
    result.paceMinPerKm = result.durationSeconds / 60 / result.distanceKm
  }

  if (result.distanceKm && !result.durationSeconds) {
    const pace = parsePaceFromString(fullText)
    if (pace && pace > 2 && pace < 15) {
      result.paceMinPerKm = pace
      result.durationSeconds = Math.round(pace * 60 * result.distanceKm)
    }
  }

  if (!result.distanceKm && !result.durationSeconds) {
    const pace = parsePaceFromString(fullText)
    const nums = extractNumbers(fullText)
    const dist = nums.find((n) => n > 2 && n < 100)
    if (pace && pace > 2 && pace < 15 && dist) {
      result.paceMinPerKm = pace
      result.distanceKm = Math.round(dist * 100) / 100
      result.durationSeconds = Math.round(pace * 60 * result.distanceKm)
    }
  }

  return result
}

export async function recognizeRunFromImage(
  imageData: string
): Promise<{ text: string; parsed: ParsedRunData }> {
  const worker = await createWorker("spa+eng")
  const { data } = await worker.recognize(imageData)
  await worker.terminate()

  const text = data.text
  const parsed = parseRunText(text)
  return { text, parsed }
}
