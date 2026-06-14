"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Activity, KeyRound, type LucideIcon, Receipt, ScrollText, TerminalSquare, Wallet } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

const NAV: NavItem[] = [
  { href: "/", label: "Overview", icon: Activity },
  { href: "/keys", label: "Virtual keys", icon: KeyRound },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/logs", label: "Request logs", icon: ScrollText },
  { href: "/playground", label: "Playground", icon: TerminalSquare },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
        <div className="flex h-14 items-center gap-2 border-b border-border px-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Receipt className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Angel Book</span>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          <p className="px-2 pb-2 pt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Gateway
          </p>
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-border p-3">
          <div className="rounded-md bg-muted/50 px-3 py-2.5">
            <p className="text-xs font-medium text-foreground">Simulation mode</p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              Requests are metered &amp; billed against your wallet, but responses are mocked.
            </p>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top nav */}
        <header className="flex items-center gap-1 overflow-x-auto border-b border-border bg-sidebar px-3 py-2 md:hidden">
          <div className="mr-2 flex items-center gap-2 pl-1">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground">
              <Receipt className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-semibold">Angel Book</span>
          </div>
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs transition-colors",
                  active ? "bg-sidebar-accent text-foreground" : "text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
