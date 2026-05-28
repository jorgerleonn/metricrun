"use client"

import { useState, useRef, useCallback } from "react"
import { Camera, Upload, Loader2, ImageUp, ScanLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { recognizeRunFromImage, type ParsedRunData } from "@/lib/ocr"
import type { Run } from "@/lib/types"
import { cn } from "@/lib/utils"

interface PhotoUploadModalProps {
  onAddRun: (run: Omit<Run, "id">) => void
}

export function PhotoUploadModal({ onAddRun }: PhotoUploadModalProps) {
  const [open, setOpen] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [recognizing, setRecognizing] = useState(false)
  const [rawText, setRawText] = useState("")
  const [parsed, setParsed] = useState<ParsedRunData>({})
  const [manualName, setManualName] = useState("")
  const [manualDistance, setManualDistance] = useState("")
  const [manualTime, setManualTime] = useState("")
  const [manualHeartRate, setManualHeartRate] = useState("")
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setImageSrc(null)
    setRecognizing(false)
    setRawText("")
    setParsed({})
    setManualName("")
    setManualDistance("")
    setManualTime("")
    setManualHeartRate("")
  }, [])

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return
    reset()
    const reader = new FileReader()
    reader.onload = async (e) => {
      const src = e.target?.result as string
      setImageSrc(src)
      setRecognizing(true)
      try {
        const { text, parsed: p } = await recognizeRunFromImage(src)
        setRawText(text)
        setParsed(p)
        setManualName(p.name ?? "")
        setManualDistance(p.distanceKm ? p.distanceKm.toString() : "")
        setManualTime(
          p.durationSeconds
            ? `${Math.floor(p.durationSeconds / 3600)
                .toString()
                .padStart(2, "0")}:${Math.floor((p.durationSeconds % 3600) / 60)
                .toString()
                .padStart(2, "0")}:${(p.durationSeconds % 60)
                .toString()
                .padStart(2, "0")}`
            : ""
        )
        setManualHeartRate(p.avgHeartRate ? p.avgHeartRate.toString() : "")
      } catch (err) {
        console.error("OCR error:", err)
      } finally {
        setRecognizing(false)
      }
    }
    reader.readAsDataURL(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const distanceNum = parseFloat(manualDistance)
    if (!distanceNum || distanceNum <= 0) return
    if (!manualTime) return

    const parts = manualTime.split(":").map(Number)
    if (parts.length !== 3 || parts.some(isNaN)) return

    const newRun: Omit<Run, "id"> = {
      name: manualName || undefined,
      distanceKm: distanceNum,
      durationSeconds: parts[0] * 3600 + parts[1] * 60 + parts[2],
      date: new Date().toISOString().split("T")[0],
      avgHeartRate: manualHeartRate ? parseInt(manualHeartRate) : undefined,
    }

    onAddRun(newRun)
    setOpen(false)
    reset()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/30">
          <Camera className="h-4 w-4" />
          Subir Foto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reconocer Carrera desde Foto</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!imageSrc && (
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition-colors",
                dragging
                  ? "border-purple-400 bg-purple-500/10"
                  : "border-border hover:border-purple-400/50 hover:bg-muted/50"
              )}
            >
              <ImageUp className="h-10 w-10 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">
                  Arrastra una foto o haz clic para subir
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Pantallazo de tu reloj, móvil o PDF de carrera
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                }}
              />
            </div>
          )}

          {imageSrc && (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-xl border bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageSrc}
                  alt="Foto subida"
                  className="max-h-64 w-full object-contain"
                />
              </div>

              {recognizing && (
                <div className="flex items-center justify-center gap-2 rounded-lg bg-muted py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
                  <span className="text-sm text-muted-foreground">
                    Reconociendo datos...
                  </span>
                </div>
              )}

              {rawText && !recognizing && (
                <>
                  <div className="rounded-lg bg-muted p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <ScanLine className="h-4 w-4 text-purple-400" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Texto reconocido
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {rawText}
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="photo-name">Carrera / Nombre</Label>
                      <Input
                        id="photo-name"
                        placeholder="Ej: Media Maratón Valencia"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="photo-distance">Distancia (km)</Label>
                        <Input
                          id="photo-distance"
                          type="number"
                          step="0.01"
                          min="0.1"
                          placeholder="10.5"
                          value={manualDistance}
                          onChange={(e) => setManualDistance(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="photo-time">Tiempo (hh:mm:ss)</Label>
                        <Input
                          id="photo-time"
                          type="text"
                          placeholder="01:45:30"
                          value={manualTime}
                          onChange={(e) => setManualTime(e.target.value)}
                          pattern="^\d{1,2}:\d{2}:\d{2}$"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="photo-pace">Ritmo Medio</Label>
                        <Input
                          id="photo-pace"
                          type="text"
                          readOnly
                          tabIndex={-1}
                          className="cursor-default opacity-80"
                          placeholder="--:-- min/km"
                          value={(() => {
                            const d = parseFloat(manualDistance)
                            if (!d || d <= 0) return ""
                            const p = manualTime.split(":").map(Number)
                            if (p.length !== 3 || p.some(isNaN)) return ""
                            const totalSec = p[0] * 3600 + p[1] * 60 + p[2]
                            if (totalSec <= 0) return ""
                            const paceMin = totalSec / 60 / d
                            const min = Math.floor(paceMin)
                            const sec = Math.round((paceMin - min) * 60)
                            return `${min}:${sec.toString().padStart(2, "0")} min/km`
                          })()}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="photo-hrm">PPM (frecuencia cardíaca)</Label>
                      <Input
                        id="photo-hrm"
                        type="number"
                        min="40"
                        max="250"
                        placeholder="155"
                        value={manualHeartRate}
                        onChange={(e) => setManualHeartRate(e.target.value)}
                      />
                    </div>

                    {parsed.distanceKm && (
                      <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
                        <p className="text-xs text-purple-400 font-medium">
                          Datos detectados automáticamente — puedes editarlos arriba
                        </p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setImageSrc(null)
                          reset()
                        }}
                      >
                        Cambiar foto
                      </Button>
                      <Button type="submit" className="flex-1 bg-purple-500/80 hover:bg-purple-500">
                        Guardar Carrera
                      </Button>
                    </div>
                  </form>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
