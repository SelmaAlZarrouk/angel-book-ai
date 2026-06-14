"use client"

import { useEffect, useRef, useState } from "react"
import useSWR from "swr"
import { Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { fetcher } from "@/lib/fetcher"
import { MODEL_LIST, formatUsd } from "@/lib/pricing"
import type { ModelId, VirtualKey } from "@/lib/types"
import { PageHeader } from "./page-header"

type KeyView = Omit<VirtualKey, "secret">

interface Billing {
  base_cost_usd: number
  margin_usd: number
  billed_usd: number
}

export function Playground() {
  const { data: keysData } = useSWR<{ keys: KeyView[] }>("/api/keys", fetcher)
  const keys = keysData?.keys.filter((k) => k.status === "active") ?? []

  const [keyId, setKeyId] = useState<string>("")
  const [model, setModel] = useState<ModelId>("angel-gpt-4o-mini")
  const [prompt, setPrompt] = useState("Explain what an AI gateway does in two sentences.")
  const [output, setOutput] = useState("")
  const [billing, setBilling] = useState<Billing | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [streaming, setStreaming] = useState(false)
  const outputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!keyId && keys.length) setKeyId(keys[0].id)
  }, [keys, keyId])

  useEffect(() => {
    outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight })
  }, [output])

  async function send() {
    const key = keys.find((k) => k.id === keyId)
    if (!key) {
      setError("Select an active key first.")
      return
    }
    setOutput("")
    setBilling(null)
    setError(null)
    setStreaming(true)

    try {
      // We don't have the raw secret client-side, so resolve it through a helper.
      const secretRes = await fetch(`/api/keys/${key.id}/secret`)
      const { secret } = await secretRes.json()

      const res = await fetch("/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
        body: JSON.stringify({ model, stream: true, messages: [{ role: "user", content: prompt }] }),
      })

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => null)
        setError(err?.error?.message ?? "Request failed.")
        setStreaming(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n\n")
        buffer = lines.pop() ?? ""
        for (const line of lines) {
          const data = line.replace(/^data:\s*/, "").trim()
          if (!data || data === "[DONE]") continue
          try {
            const json = JSON.parse(data)
            const delta = json.choices?.[0]?.delta?.content
            if (delta) setOutput((prev) => prev + delta)
            if (json.angel_book) setBilling(json.angel_book)
          } catch {
            /* ignore partial */
          }
        }
      }
    } catch {
      setError("Network error while streaming.")
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Playground"
        description="Fire a live request through the gateway with one of your virtual keys. The response streams back token-by-token and is billed against your wallet — watch it land in the logs."
      />

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Request */}
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Virtual key</label>
              <Select value={keyId} onValueChange={setKeyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a key" />
                </SelectTrigger>
                <SelectContent>
                  {keys.map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Model</label>
              <Select value={model} onValueChange={(v) => setModel(v as ModelId)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_LIST.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-1 flex-col space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/40 focus-visible:ring-2"
            />
          </div>

          <Button onClick={send} disabled={streaming || !keyId}>
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {streaming ? "Streaming…" : "Send request"}
          </Button>
        </div>

        {/* Response */}
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Response</h2>
            {streaming && <span className="font-mono text-xs text-primary">streaming</span>}
          </div>

          <div
            ref={outputRef}
            className="min-h-48 flex-1 overflow-y-auto rounded-md bg-muted/40 p-3 font-mono text-sm leading-relaxed"
          >
            {error ? (
              <span className="text-destructive">{error}</span>
            ) : output ? (
              <span className="whitespace-pre-wrap">{output}</span>
            ) : (
              <span className="text-muted-foreground">Output will stream here…</span>
            )}
          </div>

          {billing && (
            <div className="grid grid-cols-3 gap-2 rounded-md border border-border bg-background p-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Provider</p>
                <p className="font-mono text-sm tabular-nums">{formatUsd(billing.base_cost_usd)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Margin</p>
                <p className="font-mono text-sm tabular-nums text-primary">{formatUsd(billing.margin_usd)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Billed</p>
                <p className="font-mono text-sm tabular-nums">{formatUsd(billing.billed_usd)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Use it from your code</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          The gateway speaks an OpenAI-compatible API. Point any SDK at this base URL with your virtual key.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-md bg-muted/40 p-3 font-mono text-xs leading-relaxed text-muted-foreground">
{`curl https://your-domain/api/v1/chat/completions \\
  -H "Authorization: Bearer ab-live-..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${model}",
    "stream": true,
    "messages": [{ "role": "user", "content": "Hello" }]
  }'`}
        </pre>
      </div>
    </div>
  )
}
