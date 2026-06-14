import { cn } from "@/lib/utils"

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  success: { label: "success", className: "bg-primary/15 text-primary" },
  active: { label: "active", className: "bg-primary/15 text-primary" },
  revoked: { label: "revoked", className: "bg-muted text-muted-foreground" },
  error: { label: "error", className: "bg-destructive/15 text-destructive" },
  insufficient_funds: { label: "no funds", className: "bg-[var(--warning)]/15 text-[var(--warning)]" },
  limit_exceeded: { label: "limit hit", className: "bg-[var(--warning)]/15 text-[var(--warning)]" },
  rate_limited: { label: "rate limited", className: "bg-[var(--warning)]/15 text-[var(--warning)]" },
}

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, className: "bg-muted text-muted-foreground" }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[11px] font-medium",
        s.className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  )
}
