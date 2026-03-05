import { useMemo } from "react"
import { useAuth } from "../context/AuthContext"
import { useTrading } from "../context/TradingContext"

export default function Dashboard() {
  const { user } = useAuth()
  const { positions, calculateRunningPnl } = useTrading()

  const summary = useMemo(() => {
    const totalPnl = positions.reduce((acc, position) => acc + calculateRunningPnl(position), 0)
    const buyCount = positions.filter((position) => position.type === "BUY").length
    const sellCount = positions.length - buyCount

    return {
      totalPositions: positions.length,
      totalPnl,
      buyCount,
      sellCount,
    }
  }, [calculateRunningPnl, positions])

  return (
    <div className="space-y-4">
      <section className="app-surface soft-in rounded-xl p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Overview</p>
        <h1 className="mt-2 text-2xl font-bold text-white">Welcome, {user?.name ?? "Trader"}</h1>
        <p className="mt-1 text-sm text-slate-300">Your demo trading workspace is active.</p>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="app-surface soft-in rounded-xl p-4">
          <p className="text-xs text-slate-400">Open Positions</p>
          <p className="mt-2 text-2xl font-bold text-white">{summary.totalPositions}</p>
        </article>
        <article className="app-surface soft-in rounded-xl p-4">
          <p className="text-xs text-slate-400">Running P&L</p>
          <p className={`mt-2 text-2xl font-bold ${summary.totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            ${summary.totalPnl.toFixed(2)}
          </p>
        </article>
        <article className="app-surface soft-in rounded-xl p-4">
          <p className="text-xs text-slate-400">BUY Orders</p>
          <p className="mt-2 text-2xl font-bold text-emerald-400">{summary.buyCount}</p>
        </article>
        <article className="app-surface soft-in rounded-xl p-4">
          <p className="text-xs text-slate-400">SELL Orders</p>
          <p className="mt-2 text-2xl font-bold text-rose-400">{summary.sellCount}</p>
        </article>
      </section>

      <section className="app-surface soft-in rounded-xl p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">Latest Activity</h2>
        {positions.length === 0 ? (
          <p className="text-sm text-slate-400">No trades yet. Place your first order in Trading.</p>
        ) : (
          <ul className="space-y-2">
            {positions.slice(0, 5).map((position) => (
              <li
                key={position.id}
                className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm"
              >
                <span>
                  #{position.id} {position.symbol}
                </span>
                <span className={position.type === "BUY" ? "text-emerald-400" : "text-rose-400"}>{position.type}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
