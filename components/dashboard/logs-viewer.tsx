"use client"

import { useState } from "react"
import useSWR from "swr"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { fetcher, timeAgo } from "@/lib/fetcher"
import { MODELS, formatNumber, formatUsd } from "@/lib/pricing"
import type { ModelId, RequestLog } from "@/lib/types"
import { PageHeader } from "./page-header"
import { StatusBadge } from "./status-badge"

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "success", label: "Success" },
  { value: "error", label: "Error" },
  { value: "insufficient_funds", label: "Insufficient funds" },
  { value: "limit_exceeded", label: "Limit exceeded" },
]

export function LogsViewer() {
  const [status, setStatus] = useState("all")
  const { data } = useSWR<{ logs: RequestLog[]; total: number }>(
    `/api/logs?limit=200&status=${status}`,
    fetcher,
    { refreshInterval: 4000 },
  )
  const logs = data?.logs ?? []

  return (
    <div>
      <PageHeader
        title="Request logs"
        description="Every request that hits the gateway — authenticated key, model, token counts, latency, provider cost, and the margin Angel Book earned on top."
      >
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Time</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Tokens</TableHead>
              <TableHead className="hidden md:table-cell text-right">Latency</TableHead>
              <TableHead className="hidden lg:table-cell text-right">Cost</TableHead>
              <TableHead className="hidden lg:table-cell text-right">Margin</TableHead>
              <TableHead className="text-right">Billed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                  No requests match this filter.
                </TableCell>
              </TableRow>
            )}
            {logs.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{timeAgo(l.ts)}</TableCell>
                <TableCell className="max-w-40 truncate text-sm">{l.keyName}</TableCell>
                <TableCell className="whitespace-nowrap text-xs">
                  <span className="text-foreground">{MODELS[l.model as ModelId]?.label ?? l.model}</span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={l.status} />
                </TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums text-muted-foreground">
                  {formatNumber(l.promptTokens + l.completionTokens)}
                </TableCell>
                <TableCell className="hidden md:table-cell text-right font-mono text-sm tabular-nums text-muted-foreground">
                  {formatNumber(l.latencyMs)}ms
                </TableCell>
                <TableCell className="hidden lg:table-cell text-right font-mono text-sm tabular-nums text-muted-foreground">
                  {formatUsd(l.baseCostUsd)}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-right font-mono text-sm tabular-nums text-primary">
                  {formatUsd(l.marginUsd)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">{formatUsd(l.billedUsd)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
