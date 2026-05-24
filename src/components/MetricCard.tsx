"use client"

import { cn } from "@/lib/utils"

interface MetricCardProps {
  label: string
  value: string
  subtext?: string
  icon: React.ReactNode
  accent?: boolean
}

export function MetricCard({ label, value, subtext, icon, accent }: MetricCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-5 transition-all hover:border-ring/50",
        accent
          ? "border-cyan-500/30 bg-cyan-500/5"
          : "bg-card"
      )}
    >
      {accent && (
        <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl" />
      )}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className={cn("text-2xl font-bold tracking-tight", accent && "text-cyan-400")}>
            {value}
          </p>
          {subtext && (
            <p className="text-xs text-muted-foreground">{subtext}</p>
          )}
        </div>
        <div className={cn("rounded-lg p-2.5", accent ? "bg-cyan-500/10 text-cyan-400" : "bg-muted text-muted-foreground")}>
          {icon}
        </div>
      </div>
    </div>
  )
}
