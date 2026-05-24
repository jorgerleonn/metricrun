"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
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
import type { Run } from "@/lib/types"
import { timeToSeconds } from "@/lib/helpers"

interface AddRunModalProps {
  onAddRun: (run: Omit<Run, "id">) => void
}

export function AddRunModal({ onAddRun }: AddRunModalProps) {
  const [open, setOpen] = useState(false)
  const [distance, setDistance] = useState("")
  const [time, setTime] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [notes, setNotes] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const distanceNum = parseFloat(distance)
    if (!distanceNum || distanceNum <= 0) return
    if (!time || !date) return

    const newRun: Omit<Run, "id"> = {
      distanceKm: distanceNum,
      durationSeconds: timeToSeconds(time),
      date,
      notes: notes || undefined,
    }

    onAddRun(newRun)
    setOpen(false)
    setDistance("")
    setTime("")
    setDate(new Date().toISOString().split("T")[0])
    setNotes("")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30">
          <Plus className="h-4 w-4" />
          Nueva Carrera
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Registrar Carrera</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="distance">Distancia (km)</Label>
              <Input
                id="distance"
                type="number"
                step="0.1"
                min="0.1"
                placeholder="10.5"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Tiempo (hh:mm:ss)</Label>
              <Input
                id="time"
                type="text"
                placeholder="00:45:30"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                pattern="^\d{1,2}:\d{2}:\d{2}$"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Fecha</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Input
              id="notes"
              placeholder="Sensación, serie, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full">
            Guardar Carrera
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
