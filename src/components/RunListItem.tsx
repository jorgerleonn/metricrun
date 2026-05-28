"use client"

import { Clock, MapPin, Footprints, Heart } from "lucide-react"
import type { Run } from "@/lib/types"
import { formatDuration, formatPace } from "@/lib/helpers"
import { cn } from "@/lib/utils"

interface RunListItemProps {
  run: Run
}

export function RunListItem({ run }: RunListItemProps) {
  const pace = run.durationSeconds / 60 / run.distanceKm

  return (
    <div className="group flex items-center gap-4 rounded-lg border border-border/50 bg-card/50 p-4 transition-all hover:border-border hover:bg-card">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-500/10">
        <Footprints className="h-5 w-5 text-cyan-400" />
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {run.name ?? `${run.distanceKm.toFixed(1)} km`}
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {run.name && <span>{run.distanceKm.toFixed(1)} km</span>}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(run.durationSeconds)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {formatPace(pace)}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {run.avgHeartRate && (
            <span className="hidden items-center gap-1 text-xs text-red-400 sm:inline-flex">
              <Heart className="h-3 w-3" />
              {run.avgHeartRate} ppm
            </span>
          )}
          {run.cadence && (
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {run.cadence} spm
            </span>
          )}
          <span className={cn(
            "text-xs tabular-nums text-muted-foreground",
            "group-hover:text-foreground transition-colors"
          )}>
            {new Date(run.date).toLocaleDateString("es-ES", {
              day: "numeric",
              month: "short",
            })}
          </span>
        </div>
      </div>
    </div>
  )
}
