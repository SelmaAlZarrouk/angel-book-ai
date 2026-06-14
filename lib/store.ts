import { computeCost, MODEL_LIST } from "./pricing"
import type { ModelId, RequestLog, VirtualKey, Wallet, WalletTxn } from "./types"

interface StoreShape {
  keys: VirtualKey[]
  logs: RequestLog[]
  wallet: Wallet
}

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`
}

function makeSecret(): string {
  return `ab-live-${Math.random().toString(36).slice(2, 14)}${Math.random().toString(36).slice(2, 14)}`
}

function maskSecret(secret: string): string {
  return `${secret.slice(0, 11)}${"•".repeat(8)}${secret.slice(-4)}`
}

export function createKeyObject(
  name: string,
  spendLimitUsd: number | null,
  allowedModels: ModelId[],
): VirtualKey {
  const secret = makeSecret()
  return {
    id: randomId("key"),
    secret,
    masked: maskSecret(secret),
    name,
    createdAt: Date.now(),
    lastUsedAt: null,
    status: "active",
    spendLimitUsd,
    allowedModels,
    totalRequests: 0,
    totalTokens: 0,
    totalSpendUsd: 0,
  }
}

function seed(): StoreShape {
  const now = Date.now()
  const keys: VirtualKey[] = [
    createKeyObject("Production · web app", 250, []),
    createKeyObject("Mobile client", 100, ["angel-gpt-4o-mini", "angel-claude-haiku"]),
    createKeyObject("Internal tooling", null, []),
  ]

  const logs: RequestLog[] = []
  const wallet: Wallet = {
    balanceUsd: 500,
    lowBalanceThresholdUsd: 25,
    perRequestCapUsd: 5,
    txns: [
      {
        id: randomId("txn"),
        ts: now - 1000 * 60 * 60 * 24 * 6,
        type: "credit",
        amountUsd: 500,
        description: "Initial credit",
        balanceAfter: 500,
      },
    ],
  }

  // Backfill ~7 days of realistic traffic.
  const models = MODEL_LIST.map((m) => m.id)
  let balance = 500
  const totalEvents = 480
  for (let i = totalEvents; i > 0; i--) {
    const ts = now - (i / totalEvents) * 1000 * 60 * 60 * 24 * 7 + Math.random() * 1000 * 60 * 30
    const key = keys[Math.floor(Math.random() * keys.length)]
    let model = models[Math.floor(Math.random() * models.length)]
    if (key.allowedModels.length && !key.allowedModels.includes(model)) {
      model = key.allowedModels[Math.floor(Math.random() * key.allowedModels.length)]
    }
    const promptTokens = 200 + Math.floor(Math.random() * 2200)
    const completionTokens = 80 + Math.floor(Math.random() * 1400)
    const cost = computeCost(model, promptTokens, completionTokens)
    const roll = Math.random()
    const status: RequestLog["status"] = roll > 0.97 ? "error" : "success"
    if (status === "success") {
      balance -= cost.billedUsd
    }
    logs.push({
      id: randomId("req"),
      ts: Math.round(ts),
      keyId: key.id,
      keyName: key.name,
      model,
      status,
      promptTokens,
      completionTokens,
      baseCostUsd: cost.baseCostUsd,
      marginUsd: cost.marginUsd,
      billedUsd: status === "success" ? cost.billedUsd : 0,
      latencyMs: 220 + Math.floor(Math.random() * 1800),
    })
    if (status === "success") {
      key.totalRequests += 1
      key.totalTokens += promptTokens + completionTokens
      key.totalSpendUsd += cost.billedUsd
      key.lastUsedAt = Math.round(ts)
    }
  }
  logs.sort((a, b) => b.ts - a.ts)
  wallet.balanceUsd = Math.round(balance * 100) / 100

  return { keys, logs, wallet }
}

// HMR-safe singleton.
const globalForStore = globalThis as unknown as { __angelBookStore?: StoreShape }

export function getStore(): StoreShape {
  if (!globalForStore.__angelBookStore) {
    globalForStore.__angelBookStore = seed()
  }
  return globalForStore.__angelBookStore
}

export function addCredit(amountUsd: number, description: string): WalletTxn {
  const store = getStore()
  store.wallet.balanceUsd = Math.round((store.wallet.balanceUsd + amountUsd) * 100) / 100
  const txn: WalletTxn = {
    id: randomId("txn"),
    ts: Date.now(),
    type: "credit",
    amountUsd,
    description,
    balanceAfter: store.wallet.balanceUsd,
  }
  store.wallet.txns.unshift(txn)
  return txn
}

export function debitWallet(amountUsd: number, description: string): WalletTxn {
  const store = getStore()
  store.wallet.balanceUsd = Math.round((store.wallet.balanceUsd - amountUsd) * 100) / 100
  const txn: WalletTxn = {
    id: randomId("txn"),
    ts: Date.now(),
    type: "debit",
    amountUsd,
    description,
    balanceAfter: store.wallet.balanceUsd,
  }
  store.wallet.txns.unshift(txn)
  return txn
}

export function findKeyBySecret(secret: string): VirtualKey | undefined {
  return getStore().keys.find((k) => k.secret === secret)
}

export { randomId, maskSecret }
