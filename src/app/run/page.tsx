"use client"

import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

const RunTracker = dynamic(
  () => import("@/components/RunTracker"),
  { ssr: false, loading: () => (
    <div className="flex h-dvh items-center justify-center bg-neutral-950">
      <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
    </div>
  )}
)

export default function RunPage() {
  return <RunTracker />
}
