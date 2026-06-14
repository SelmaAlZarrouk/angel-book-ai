"use client"

import { useState } from "react"
import useSWR, { mutate } from "swr"
import { Check, Copy, KeyRound, MoreVertical, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { fetcher, timeAgo } from "@/lib/fetcher"
import { MODEL_LIST, formatNumber, formatUsd } from "@/lib/pricing"
import type { ModelId, VirtualKey } from "@/lib/types"
import { PageHeader } from "./page-header"
import { StatusBadge } from "./status-badge"
import { cn } from "@/lib/utils"

type KeyView = Omit<VirtualKey, "secret">

export function KeysManager() {
  const { data } = useSWR<{ keys: KeyView[] }>("/api/keys", fetcher, { refreshInterval: 5000 })
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState("")
  const [spendLimit, setSpendLimit] = useState("")
  const [selectedModels, setSelectedModels] = useState<ModelId[]>([])
  const [creating, setCreating] = useState(false)
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const keys = data?.keys ?? []

  function toggleModel(id: ModelId) {
    setSelectedModels((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]))
  }

  async function createKey() {
    if (!name.trim()) {
      toast.error("Give your key a name.")
      return
    }
    setCreating(true)
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          spendLimitUsd: spendLimit ? Number(spendLimit) : null,
          allowedModels: selectedModels,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed")
      setRevealedSecret(json.key.secret)
      setName("")
      setSpendLimit("")
      setSelectedModels([])
      setCreateOpen(false)
      mutate("/api/keys")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create key")
    } finally {
      setCreating(false)
    }
  }

  async function updateKey(id: string, body: Record<string, unknown>) {
    await fetch(`/api/keys/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    mutate("/api/keys")
  }

  async function deleteKey(id: string) {
    await fetch(`/api/keys/${id}`, { method: "DELETE" })
    mutate("/api/keys")
    toast.success("Key deleted.")
  }

  function copySecret() {
    if (!revealedSecret) return
    navigator.clipboard.writeText(revealedSecret)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div>
      <PageHeader
        title="Virtual keys"
        description="Issue scoped API keys for each app or environment. Set per-key spend limits and restrict which models a key can call — every request is metered against these rules."
      >
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New key
        </Button>
      </PageHeader>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Key</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Spend limit</TableHead>
              <TableHead className="hidden lg:table-cell">Models</TableHead>
              <TableHead className="text-right">Spend</TableHead>
              <TableHead className="hidden sm:table-cell text-right">Requests</TableHead>
              <TableHead className="hidden md:table-cell">Last used</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  No keys yet. Create one to start routing requests.
                </TableCell>
              </TableRow>
            )}
            {keys.map((k) => {
              const overLimit = k.spendLimitUsd != null && k.totalSpendUsd >= k.spendLimitUsd
              return (
                <TableRow key={k.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                        <KeyRound className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{k.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">{k.masked}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={k.status} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell font-mono text-sm tabular-nums">
                    {k.spendLimitUsd != null ? (
                      <span className={cn(overLimit && "text-[var(--warning)]")}>
                        {formatUsd(k.spendLimitUsd, 2)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">none</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                    {k.allowedModels.length === 0 ? "all" : `${k.allowedModels.length} restricted`}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {formatUsd(k.totalSpendUsd, 2)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-right font-mono text-sm tabular-nums text-muted-foreground">
                    {formatNumber(k.totalRequests)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                    {k.lastUsedAt ? timeAgo(k.lastUsedAt) : "never"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Key actions</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => updateKey(k.id, { status: k.status === "active" ? "revoked" : "active" })}
                        >
                          {k.status === "active" ? "Revoke key" : "Re-activate key"}
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => deleteKey(k.id)}>
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create virtual key</DialogTitle>
            <DialogDescription>
              Scope this key to a single app or environment. Limits are enforced on every request.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="key-name">Name</Label>
              <Input
                id="key-name"
                placeholder="Production · web app"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="key-limit">Spend limit (USD, optional)</Label>
              <Input
                id="key-limit"
                type="number"
                min="0"
                step="any"
                placeholder="No limit"
                value={spendLimit}
                onChange={(e) => setSpendLimit(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Allowed models</Label>
              <p className="text-xs text-muted-foreground">Leave all unselected to allow every model.</p>
              <div className="flex flex-wrap gap-1.5">
                {MODEL_LIST.map((m) => {
                  const on = selectedModels.includes(m.id)
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleModel(m.id)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs transition-colors",
                        on
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {m.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createKey} disabled={creating}>
              {creating ? "Creating…" : "Create key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reveal-once dialog */}
      <Dialog open={!!revealedSecret} onOpenChange={(o) => !o && setRevealedSecret(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your new API key</DialogTitle>
            <DialogDescription>
              Copy it now — for security, the full secret is shown only once and cannot be retrieved later.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 p-3">
            <code className="min-w-0 flex-1 truncate font-mono text-sm">{revealedSecret}</code>
            <Button size="icon" variant="secondary" className="h-8 w-8 shrink-0" onClick={copySecret}>
              {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              <span className="sr-only">Copy</span>
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setRevealedSecret(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
