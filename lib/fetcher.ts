export const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Request failed")
  return res.json()
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const s = Math.round(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  return `${d}d ago`
}
