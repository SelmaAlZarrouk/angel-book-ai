"use client"

import { useState } from "react"
import useSWR from "swr"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Activity, AlertTriangle, Coins, Gauge, KeyRound, TrendingUp, Wallet, Zap } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { fetcher } from "@/lib/fetcher"
import { formatNumber, formatUsd } from "@/lib/pricing"
import { PageHeader } from "./page-header"
import { StatCard } from "./stat-card"
import { cn } from "@/lib/utils"

interface StatsResponse {
  totals: {
    requests: number
    tokens: number
    billedUsd: number
    baseUsd: number
    marginUsd: number
    errorRate: number
    avgLatencyMs: number
    balanceUsd: number
    activeKeys: number
  }
  series: { t: number; requests: number; errors: number; spend: number; tokens: number }[]
  byModel: { model: string; label: string; requests: number; spend: number; tokens: number }[]
}

const RANGES = [
  { label: "24h", hours: 24 },
  { label: "7d", hours: 24 * 7 },
  { label: "30d", hours: 24 * 30 },
]

export function Overview() {
  const [hours, setHours] = useState(24 * 7)
  const { data, isLoading } = useSWR<StatsResponse>(`/api/stats?hours=${hours}`, fetcher, {
    refreshInterval: 5000,
  })

  const t = data?.totals
  const series =
    data?.series.map((p) => ({
      ...p,
      label:
        hours <= 24
          ? new Date(p.t).toLocaleTimeString("en-US", { hour: "numeric" })
          : new Date(p.t).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    })) ?? []

  const maxModelSpend = Math.max(1, ...(data?.byModel.map((m) => m.spend) ?? [1]))

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Live telemetry across every virtual key — request volume, token spend, gateway margin, and your prepaid wallet balance."
      >
        <div className="flex items-center gap-1 rounded-md border border-border bg-card p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.hours}
              onClick={() => setHours(r.hours)}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                hours === r.hours
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Requests"
          value={t ? formatNumber(t.requests) : "—"}
          sub={t ? `${(t.errorRate * 100).toFixed(1)}% error rate` : undefined}
          icon={Activity}
        />
        <StatCard
          label="Tokens"
          value={t ? formatNumber(t.tokens) : "—"}
          sub={t ? `${formatNumber(Math.round(t.avgLatencyMs))}ms avg latency` : undefined}
          icon={Zap}
        />
        <StatCard
          label="Billed"
          value={t ? formatUsd(t.billedUsd, 2) : "—"}
          sub={t ? `${formatUsd(t.baseUsd, 2)} provider cost` : undefined}
          icon={Coins}
        />
        <StatCard
          label="Gateway margin"
          value={t ? formatUsd(t.marginUsd, 2) : "—"}
          sub="Profit on routed spend"
          icon={TrendingUp}
          tone="success"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Wallet balance"
          value={t ? formatUsd(t.balanceUsd, 2) : "—"}
          sub="Prepaid credits"
          icon={Wallet}
        />
        <StatCard label="Active keys" value={t ? String(t.activeKeys) : "—"} sub="Issued & enabled" icon={KeyRound} />
        <StatCard
          label="Avg latency"
          value={t ? `${formatNumber(Math.round(t.avgLatencyMs))}ms` : "—"}
          sub="End to end"
          icon={Gauge}
        />
        <StatCard
          label="Error rate"
          value={t ? `${(t.errorRate * 100).toFixed(1)}%` : "—"}
          sub="Blocked + failed"
          icon={AlertTriangle}
          tone={t && t.errorRate > 0.05 ? "warning" : "default"}
        />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Spend over time</h2>
              <p className="text-xs text-muted-foreground">Billed USD per interval</p>
            </div>
            <span className="font-mono text-xs text-muted-foreground">live · 5s</span>
          </div>
          <ChartContainer
            config={{
              spend: { label: "Billed", color: "var(--chart-1)" },
              requests: { label: "Requests", color: "var(--chart-2)" },
            }}
            className="h-[260px] w-full"
          >
            <AreaChart data={series} margin={{ left: 4, right: 4, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="fillSpend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-spend)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-spend)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                className="text-[11px]"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={44}
                tickFormatter={(v) => `$${Number(v).toFixed(0)}`}
                className="text-[11px]"
              />
              <ChartTooltip
                content={<ChartTooltipContent formatter={(v, n) => [n === "spend" ? formatUsd(Number(v), 2) : v, ""]} />}
              />
              <Area
                type="monotone"
                dataKey="spend"
                stroke="var(--color-spend)"
                strokeWidth={2}
                fill="url(#fillSpend)"
              />
            </AreaChart>
          </ChartContainer>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Spend by model</h2>
          <p className="text-xs text-muted-foreground">Billed USD, current range</p>
          <div className="mt-4 flex flex-col gap-3">
            {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {data?.byModel.length === 0 && <p className="text-sm text-muted-foreground">No traffic in range.</p>}
            {data?.byModel.map((m, i) => (
              <div key={m.model}>
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate font-medium">{m.label}</span>
                  <span className="ml-2 shrink-0 font-mono tabular-nums text-muted-foreground">
                    {formatUsd(m.spend, 2)}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(m.spend / maxModelSpend) * 100}%`,
                      backgroundColor: `var(--chart-${(i % 5) + 1})`,
                    }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatNumber(m.requests)} req · {formatNumber(m.tokens)} tokens
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
