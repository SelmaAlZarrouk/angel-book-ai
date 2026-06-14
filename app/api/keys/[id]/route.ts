import { getStore } from "@/lib/store"

export const dynamic = "force-dynamic"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const store = getStore()
  const key = store.keys.find((k) => k.id === id)
  if (!key) return Response.json({ error: "Key not found" }, { status: 404 })

  let body: { status?: "active" | "revoked"; spendLimitUsd?: number | null }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (body.status === "active" || body.status === "revoked") key.status = body.status
  if (body.spendLimitUsd !== undefined) {
    key.spendLimitUsd =
      body.spendLimitUsd == null || Number.isNaN(Number(body.spendLimitUsd)) ? null : Number(body.spendLimitUsd)
  }

  const { secret, ...rest } = key
  return Response.json({ key: rest })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const store = getStore()
  const idx = store.keys.findIndex((k) => k.id === id)
  if (idx === -1) return Response.json({ error: "Key not found" }, { status: 404 })
  store.keys.splice(idx, 1)
  return Response.json({ ok: true })
}
