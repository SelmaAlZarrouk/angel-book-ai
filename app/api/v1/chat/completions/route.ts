import { computeCost, isModelId, MODELS } from "@/lib/pricing"
import { debitWallet, getStore, randomId } from "@/lib/store"
import type { ModelId, RequestLog } from "@/lib/types"

export const dynamic = "force-dynamic"

const SAMPLE_RESPONSE =
  "Here's a concise answer routed through the Angel Book gateway. Your request was authenticated against a virtual key, checked against your wallet balance and spend limits, then billed per token at the model's rate plus the gateway margin. In production this stream would be proxied from the upstream provider, but the metering, circuit breakers, and telemetry you see are exactly what runs live."

function approxTokens(text: string): number {
  // Rough heuristic: ~4 chars per token.
  return Math.max(1, Math.round(text.length / 4))
}

function errorBody(code: string, message: string) {
  return { error: { code, message } }
}

function logEvent(entry: RequestLog) {
  const store = getStore()
  store.logs.unshift(entry)
  if (store.logs.length > 5000) store.logs.length = 5000
}

export async function POST(req: Request) {
  const started = Date.now()
  const auth = req.headers.get("authorization") || ""
  const secret = auth.replace(/^Bearer\s+/i, "").trim()

  const store = getStore()
  const key = store.keys.find((k) => k.secret === secret)

  if (!key) {
    return Response.json(errorBody("invalid_key", "Missing or invalid API key."), { status: 401 })
  }
  if (key.status === "revoked") {
    return Response.json(errorBody("key_revoked", "This API key has been revoked."), { status: 403 })
  }

  let payload: { model?: string; messages?: { role: string; content: string }[]; stream?: boolean }
  try {
    payload = await req.json()
  } catch {
    return Response.json(errorBody("bad_request", "Invalid JSON body."), { status: 400 })
  }

  const model = payload.model
  if (!model || !isModelId(model)) {
    return Response.json(
      errorBody("invalid_model", `Unknown model. Valid models: ${Object.keys(MODELS).join(", ")}`),
      { status: 400 },
    )
  }
  if (key.allowedModels.length && !key.allowedModels.includes(model)) {
    logEvent(buildLog(key, model, "error", 0, 0, started))
    return Response.json(errorBody("model_not_allowed", "This key is not permitted to use this model."), {
      status: 403,
    })
  }

  const promptText = (payload.messages || []).map((m) => m.content).join("\n")
  const promptTokens = Math.max(8, approxTokens(promptText))

  // --- Circuit breakers (pre-flight) ---
  const wallet = store.wallet
  if (wallet.balanceUsd <= wallet.lowBalanceThresholdUsd) {
    logEvent(buildLog(key, model, "insufficient_funds", promptTokens, 0, started))
    return Response.json(
      errorBody(
        "insufficient_funds",
        `Wallet balance (${wallet.balanceUsd.toFixed(2)}) is at or below the low-balance threshold (${wallet.lowBalanceThresholdUsd.toFixed(2)}). Add credits to continue.`,
      ),
      { status: 402 },
    )
  }

  const completionText = SAMPLE_RESPONSE
  const completionTokens = approxTokens(completionText)
  const cost = computeCost(model as ModelId, promptTokens, completionTokens)

  if (cost.billedUsd > wallet.perRequestCapUsd) {
    logEvent(buildLog(key, model, "limit_exceeded", promptTokens, 0, started))
    return Response.json(
      errorBody(
        "per_request_cap_exceeded",
        `Estimated cost (${cost.billedUsd.toFixed(4)}) exceeds the per-request cap (${wallet.perRequestCapUsd.toFixed(2)}).`,
      ),
      { status: 403 },
    )
  }

  if (key.spendLimitUsd != null && key.totalSpendUsd + cost.billedUsd > key.spendLimitUsd) {
    logEvent(buildLog(key, model, "limit_exceeded", promptTokens, 0, started))
    return Response.json(
      errorBody(
        "key_spend_limit_exceeded",
        `This key has reached its spend limit of ${key.spendLimitUsd.toFixed(2)}.`,
      ),
      { status: 403 },
    )
  }

  // --- Commit billing + usage ---
  function commit() {
    debitWallet(cost.billedUsd, `${MODELS[model as ModelId].label} · ${key!.name}`)
    key!.totalRequests += 1
    key!.totalTokens += promptTokens + completionTokens
    key!.totalSpendUsd = Math.round((key!.totalSpendUsd + cost.billedUsd) * 1e6) / 1e6
    key!.lastUsedAt = Date.now()
    logEvent(buildLog(key!, model as ModelId, "success", promptTokens, completionTokens, started, cost))
  }

  // --- Non-streaming response ---
  if (!payload.stream) {
    commit()
    return Response.json({
      id: randomId("chatcmpl"),
      object: "chat.completion",
      model,
      choices: [{ index: 0, message: { role: "assistant", content: completionText }, finish_reason: "stop" }],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      },
      angel_book: { base_cost_usd: cost.baseCostUsd, margin_usd: cost.marginUsd, billed_usd: cost.billedUsd },
    })
  }

  // --- Streaming (SSE) response ---
  const words = completionText.split(" ")
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < words.length; i++) {
        const chunk = {
          id: randomId("chatcmpl"),
          object: "chat.completion.chunk",
          model,
          choices: [{ index: 0, delta: { content: (i === 0 ? "" : " ") + words[i] }, finish_reason: null }],
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
        await new Promise((r) => setTimeout(r, 24 + Math.random() * 36))
      }
      commit()
      const usage = {
        id: randomId("chatcmpl"),
        object: "chat.completion.chunk",
        model,
        choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: promptTokens + completionTokens,
        },
        angel_book: { base_cost_usd: cost.baseCostUsd, margin_usd: cost.marginUsd, billed_usd: cost.billedUsd },
      }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(usage)}\n\n`))
      controller.enqueue(encoder.encode("data: [DONE]\n\n"))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}

function buildLog(
  key: { id: string; name: string },
  model: ModelId,
  status: RequestLog["status"],
  promptTokens: number,
  completionTokens: number,
  started: number,
  cost?: { baseCostUsd: number; marginUsd: number; billedUsd: number },
): RequestLog {
  return {
    id: randomId("req"),
    ts: Date.now(),
    keyId: key.id,
    keyName: key.name,
    model,
    status,
    promptTokens,
    completionTokens,
    baseCostUsd: cost?.baseCostUsd ?? 0,
    marginUsd: cost?.marginUsd ?? 0,
    billedUsd: status === "success" ? (cost?.billedUsd ?? 0) : 0,
    latencyMs: Date.now() - started,
  }
}
