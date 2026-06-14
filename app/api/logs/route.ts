import { getStore } from "@/lib/store"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const store = getStore()
  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get("limit")) || 100, 500)
  const status = searchParams.get("status")
  const keyId = searchParams.get("keyId")

  let logs = store.logs
  if (status && status !== "all") logs = logs.filter((l) => l.status === status)
  if (keyId && keyId !== "all") logs = logs.filter((l) => l.keyId === keyId)

  return Response.json({ logs: logs.slice(0, limit), total: logs.length })
}
