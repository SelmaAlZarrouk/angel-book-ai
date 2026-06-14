import { addCredit, getStore } from "@/lib/store"

export const dynamic = "force-dynamic"

export async function GET() {
  const store = getStore()
  return Response.json({ wallet: { ...store.wallet, txns: store.wallet.txns.slice(0, 50) } })
}

export async function POST(req: Request) {
  const store = getStore()
  let body: { action?: string; amountUsd?: number; lowBalanceThresholdUsd?: number; perRequestCapUsd?: number }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (body.action === "credit") {
    const amount = Number(body.amountUsd)
    if (!amount || amount <= 0) return Response.json({ error: "Amount must be positive." }, { status: 400 })
    addCredit(amount, "Manual credit")
    return Response.json({ wallet: { ...store.wallet, txns: store.wallet.txns.slice(0, 50) } })
  }

  if (body.action === "settings") {
    if (body.lowBalanceThresholdUsd != null && body.lowBalanceThresholdUsd >= 0) {
      store.wallet.lowBalanceThresholdUsd = Number(body.lowBalanceThresholdUsd)
    }
    if (body.perRequestCapUsd != null && body.perRequestCapUsd > 0) {
      store.wallet.perRequestCapUsd = Number(body.perRequestCapUsd)
    }
    return Response.json({ wallet: { ...store.wallet, txns: store.wallet.txns.slice(0, 50) } })
  }

  return Response.json({ error: "Unknown action." }, { status: 400 })
}
