import { MODELS } from "@/lib/pricing"
import { getStore } from "@/lib/store"
import type { ModelId } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const store = getStore()
  const { searchParams } = new URL(req.url)
  const rangeHours = Number(searchParams.get("hours")) || 24 * 7

  const now = Date.now()
  const since = now - rangeHours * 60 * 60 * 1000
  const inRange = store.logs.filter((l) => l.ts >= since)
  const successful = inRange.filter((l) => l.status === "success")

  const totalRequests = inRange.length
  const errorCount = inRange.filter((l) => l.status !== "success").length
  const totalTokens = successful.reduce((s, l) => s + l.promptTokens + l.completionTokens, 0)
  const totalBilled = successful.reduce((s, l) => s + l.billedUsd, 0)
  const totalBase = successful.reduce((s, l) => s + l.baseCostUsd, 0)
  const totalMargin = successful.reduce((s, l) => s + l.marginUsd, 0)
  const avgLatency = successful.length
    ? successful.reduce((s, l) => s + l.latencyMs, 0) / successful.length
    : 0

  // Bucket the time series.
  const buckets = rangeHours <= 24 ? 24 : rangeHours <= 24 * 7 ? 28 : 30
  const bucketMs = (rangeHours * 60 * 60 * 1000) / buckets
  const series = Array.from({ length: buckets }, (_, i) => {
    const start = since + i * bucketMs
    return { t: Math.round(start), requests: 0, errors: 0, spend: 0, tokens: 0 }
  })
  for (const l of inRange) {
    const idx = Math.min(buckets - 1, Math.max(0, Math.floor((l.ts - since) / bucketMs)))
    series[idx].requests += 1
    if (l.status !== "success") series[idx].errors += 1
    series[idx].spend += l.billedUsd
    series[idx].tokens += l.status === "success" ? l.promptTokens + l.completionTokens : 0
  }

  // Per-model breakdown.
  const byModel: Record<string, { model: ModelId; label: string; requests: number; spend: number; tokens: number }> =
    {}
  for (const l of successful) {
    if (!byModel[l.model]) {
      byModel[l.model] = { model: l.model, label: MODELS[l.model].label, requests: 0, spend: 0, tokens: 0 }
    }
    byModel[l.model].requests += 1
    byModel[l.model].spend += l.billedUsd
    byModel[l.model].tokens += l.promptTokens + l.completionTokens
  }

  return Response.json({
    totals: {
      requests: totalRequests,
      tokens: totalTokens,
      billedUsd: totalBilled,
      baseUsd: totalBase,
      marginUsd: totalMargin,
      errorRate: totalRequests ? errorCount / totalRequests : 0,
      avgLatencyMs: avgLatency,
      balanceUsd: store.wallet.balanceUsd,
      activeKeys: store.keys.filter((k) => k.status === "active").length,
    },
    series,
    byModel: Object.values(byModel).sort((a, b) => b.spend - a.spend),
  })
}
