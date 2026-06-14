import type { ModelId, ModelInfo } from "./types"

/**
 * The margin Angel Book adds on top of upstream provider cost.
 * This is the core revenue mechanism: customers pay base cost + margin.
 * 0.20 = 20% markup.
 */
export const MARGIN_RATE = 0.2

export const MODELS: Record<ModelId, ModelInfo> = {
  "angel-gpt-4o": {
    id: "angel-gpt-4o",
    label: "Angel GPT-4o",
    provider: "OpenAI",
    inputCostPer1M: 2.5,
    outputCostPer1M: 10,
  },
  "angel-gpt-4o-mini": {
    id: "angel-gpt-4o-mini",
    label: "Angel GPT-4o mini",
    provider: "OpenAI",
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.6,
  },
  "angel-claude-sonnet": {
    id: "angel-claude-sonnet",
    label: "Angel Claude Sonnet",
    provider: "Anthropic",
    inputCostPer1M: 3,
    outputCostPer1M: 15,
  },
  "angel-claude-haiku": {
    id: "angel-claude-haiku",
    label: "Angel Claude Haiku",
    provider: "Anthropic",
    inputCostPer1M: 0.8,
    outputCostPer1M: 4,
  },
  "angel-llama-70b": {
    id: "angel-llama-70b",
    label: "Angel Llama 3.1 70B",
    provider: "Meta",
    inputCostPer1M: 0.59,
    outputCostPer1M: 0.79,
  },
}

export const MODEL_LIST = Object.values(MODELS)

export function isModelId(value: string): value is ModelId {
  return value in MODELS
}

export interface CostBreakdown {
  baseCostUsd: number
  marginUsd: number
  billedUsd: number
}

export function computeCost(model: ModelId, promptTokens: number, completionTokens: number): CostBreakdown {
  const info = MODELS[model]
  const baseCostUsd =
    (promptTokens / 1_000_000) * info.inputCostPer1M + (completionTokens / 1_000_000) * info.outputCostPer1M
  const marginUsd = baseCostUsd * MARGIN_RATE
  return {
    baseCostUsd,
    marginUsd,
    billedUsd: baseCostUsd + marginUsd,
  }
}

export function formatUsd(amount: number, maxFractionDigits = 4): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: maxFractionDigits,
  }).format(amount)
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n)
}
