import { getStore } from "@/lib/store"

export const dynamic = "force-dynamic"

/**
 * Demo-only helper so the in-app Playground can issue a real request with a
 * stored key. In a production multi-tenant build this endpoint would not exist —
 * customers hold their own secret and the gateway never re-exposes it.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const key = getStore().keys.find((k) => k.id === id)
  if (!key) return Response.json({ error: "Key not found" }, { status: 404 })
  if (key.status === "revoked") return Response.json({ error: "Key revoked" }, { status: 403 })
  return Response.json({ secret: key.secret })
}
