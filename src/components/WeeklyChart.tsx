"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import type { DailyDistance } from "@/lib/types"

interface WeeklyChartProps {
  data: DailyDistance[]
}

export function WeeklyChart({ data }: WeeklyChartProps) {
  return (
    <div className="h-64 w-full [&_svg]:overflow-visible">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap="20%">
          <XAxis
            dataKey="dayLabel"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "oklch(0.708 0.01 286.375)", fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "oklch(0.708 0.01 286.375)", fontSize: 12 }}
            unit=" km"
            width={50}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "oklch(0.205 0.042 265.755)",
              border: "1px solid oklch(0.269 0.015 286.375)",
              borderRadius: "8px",
              color: "oklch(0.985 0 0)",
              fontSize: "13px",
            }}
            formatter={(value) => [`${Number(value).toFixed(1)} km`, "Distancia"]}
            labelFormatter={(label) => `${label}`}
          />
          <Bar
            dataKey="distanceKm"
            fill="oklch(0.87 0.036 195.345)"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
