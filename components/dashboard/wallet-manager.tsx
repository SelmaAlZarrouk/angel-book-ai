"use client"

import { useState } from "react"
import useSWR, { mutate } from "swr"
import { ArrowDownLeft, ArrowUpRight, ShieldAlert, Wallet } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { fetcher, timeAgo } from "@/lib/fetcher"
import { formatUsd } from "@/lib/pricing"
import type { Wallet as WalletType } from "@/lib/types"
import { PageHeader } from "./page-header"
import { cn } from "@/lib/utils"

const PRESETS = [25, 100, 500]

export function WalletManager() {
  const { data } = useSWR<{ wallet: WalletType }>("/api/wallet", fetcher, { refreshInterval: 5000 })
  const wallet = data?.wallet
  const [amount, setAmount] = useState("")
  const [threshold, setThreshold] = useState("")
  const [perReq, setPerReq] = useState("")
  const [busy, setBusy] = useState(false)

  const low = wallet ? wallet.balanceUsd <= wallet.lowBalanceThresholdUsd : false

  async function credit(value: number) {
    if (!value || value <= 0) {
      toast.error("Enter a positive amount.")
      return
    }
    setBusy(true)
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "credit", amountUsd: value }),
      })
      if (!res.ok) throw new Error("Failed")
      mutate("/api/wallet")
      setAmount("")
      toast.success(`Added ${formatUsd(value, 2)} in credits.`)
    } catch {
      toast.error("Could not add credits.")
    } finally {
      setBusy(false)
    }
  }

  async function saveSettings() {
    setBusy(true)
    try {
      await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "settings",
          lowBalanceThresholdUsd: threshold ? Number(threshold) : undefined,
          perRequestCapUsd: perReq ? Number(perReq) : undefined,
        }),
      })
      mutate("/api/wallet")
      setThreshold("")
      setPerReq("")
      toast.success("Circuit breakers updated.")
    } catch {
      toast.error("Could not save settings.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Wallet"
        description="A prepaid balance funds every routed request. Set circuit-breakers so spend can never run away — requests are blocked the moment limits are hit."
      />

      <div className="grid gap-3 lg:grid-cols-3">
        {/* Balance + add credits */}
        <div className="rounded-lg border border-border bg-card p-5 lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <Wallet className="h-4 w-4" />
                Balance
              </div>
              <p className="mt-2 font-mono text-4xl font-semibold tabular-nums tracking-tight">
                {wallet ? formatUsd(wallet.balanceUsd, 2) : "—"}
              </p>
            </div>
            {low && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--warning)]/15 px-2.5 py-1 text-xs font-medium text-[var(--warning)]">
                <ShieldAlert className="h-3.5 w-3.5" />
                Low balance — requests blocked
              </span>
            )}
          </div>

          <div className="mt-6 border-t border-border pt-5">
            <Label htmlFor="credit-amount" className="text-sm">
              Add credits
            </Label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Input
                id="credit-amount"
                type="number"
                min="0"
                step="any"
                placeholder="Amount in USD"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="sm:max-w-48"
              />
              <div className="flex gap-2">
                {PRESETS.map((p) => (
                  <Button key={p} variant="secondary" size="sm" onClick={() => credit(p)} disabled={busy}>
                    +${p}
                  </Button>
                ))}
                <Button size="sm" onClick={() => credit(Number(amount))} disabled={busy}>
                  Add
                </Button>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Manual credits for now. Stripe top-ups can be wired in later for self-serve billing.
            </p>
          </div>
        </div>

        {/* Circuit breakers */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Circuit breakers</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Hard limits enforced on every request.</p>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="threshold" className="text-xs">
                Low-balance cutoff
              </Label>
              <Input
                id="threshold"
                type="number"
                min="0"
                step="any"
                placeholder={wallet ? String(wallet.lowBalanceThresholdUsd) : "25"}
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Currently {wallet ? formatUsd(wallet.lowBalanceThresholdUsd, 2) : "—"}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="perreq" className="text-xs">
                Per-request cap
              </Label>
              <Input
                id="perreq"
                type="number"
                min="0"
                step="any"
                placeholder={wallet ? String(wallet.perRequestCapUsd) : "5"}
                value={perReq}
                onChange={(e) => setPerReq(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Currently {wallet ? formatUsd(wallet.perRequestCapUsd, 2) : "—"}
              </p>
            </div>
            <Button size="sm" className="w-full" onClick={saveSettings} disabled={busy}>
              Save limits
            </Button>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="mt-3 overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Transactions</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="hidden sm:table-cell text-right">When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {wallet?.txns.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 text-sm font-medium",
                      tx.type === "credit" ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {tx.type === "credit" ? (
                      <ArrowDownLeft className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    )}
                    {tx.type}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{tx.description}</TableCell>
                <TableCell
                  className={cn(
                    "text-right font-mono text-sm tabular-nums",
                    tx.type === "credit" ? "text-primary" : "text-foreground",
                  )}
                >
                  {tx.type === "credit" ? "+" : "−"}
                  {formatUsd(tx.amountUsd, 4)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums text-muted-foreground">
                  {formatUsd(tx.balanceAfter, 2)}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-right text-xs text-muted-foreground">
                  {timeAgo(tx.ts)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
