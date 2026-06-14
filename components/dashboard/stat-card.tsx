import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "default",
}: {
  label: string
  value: string
  sub?: string
  icon: LucideIcon
  tone?: "default" | "success" | "warning" | "destructive"
}) {
  const toneClass = {
    default: "text-muted-foreground",
    success: "text-primary",
    warning: "text-[var(--warning)]",
    destructive: "text-destructive",
  }[tone]

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className={cn("h-4 w-4", toneClass)} />
      </div>
      <p className="mt-2 font-mono text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  )
}
