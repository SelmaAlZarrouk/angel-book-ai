import { isModelId } from "@/lib/pricing"
import { createKeyObject, getStore } from "@/lib/store"
import type { ModelId } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET() {
  const store = getStore()
  // Never leak full secrets in the list view.
  const keys = store.keys.map(({ secret, ...rest }) => rest)
  return Response.json({ keys })
}

export async function POST(req: Request) {
  const store = getStore()
  let body: { name?: string; spendLimitUsd?: number | null; allowedModels?: string[] }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const name = (body.name || "").trim()
  if (!name) return Response.json({ error: "Name is required." }, { status: 400 })

  const spendLimitUsd =
    body.spendLimitUsd == null || Number.isNaN(Number(body.spendLimitUsd)) ? null : Number(body.spendLimitUsd)
  const allowedModels = (body.allowedModels || []).filter((m): m is ModelId => isModelId(m))

  const key = createKeyObject(name, spendLimitUsd, allowedModels)
  store.keys.unshift(key)

  // Return the full secret exactly once.
  return Response.json({ key }, { status: 201 })
}
