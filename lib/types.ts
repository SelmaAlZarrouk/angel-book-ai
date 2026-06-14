export type ModelId =
  | "angel-gpt-4o"
  | "angel-gpt-4o-mini"
  | "angel-claude-sonnet"
  | "angel-claude-haiku"
  | "angel-llama-70b"

export interface ModelInfo {
  id: ModelId
  label: string
  provider: string
  /** Base cost per 1M input tokens, in USD (what the upstream provider charges us). */
  inputCostPer1M: number
  /** Base cost per 1M output tokens, in USD. */
  outputCostPer1M: number
}

export interface VirtualKey {
  id: string
  /** The full secret, only returned once at creation time. */
  secret: string
  /** Masked version safe to display repeatedly. */
  masked: string
  name: string
  createdAt: number
  lastUsedAt: number | null
  status: "active" | "revoked"
  /** Optional hard spend cap for this key (USD). null = no cap. */
  spendLimitUsd: number | null
  /** Allowed models. Empty = all models. */
  allowedModels: ModelId[]
  /** Running totals attributed to this key. */
  totalRequests: number
  totalTokens: number
  totalSpendUsd: number
}

export interface RequestLog {
  id: string
  ts: number
  keyId: string
  keyName: string
  model: ModelId
  status: "success" | "rate_limited" | "insufficient_funds" | "limit_exceeded" | "error"
  promptTokens: number
  completionTokens: number
  /** Upstream provider cost in USD. */
  baseCostUsd: number
  /** Margin we charge on top (profit). */
  marginUsd: number
  /** Total billed to the wallet (base + margin). */
  billedUsd: number
  latencyMs: number
}

export interface WalletTxn {
  id: string
  ts: number
  type: "credit" | "debit"
  amountUsd: number
  description: string
  balanceAfter: number
}

export interface Wallet {
  balanceUsd: number
  /** Block requests when balance falls below this (circuit breaker). */
  lowBalanceThresholdUsd: number
  /** Auto-reject requests if a single request would exceed this. */
  perRequestCapUsd: number
  txns: WalletTxn[]
}
