import { useMemo } from "react"
import { useTrading } from "../context/TradingContext"

function formatMoney(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return "$0.00"
  return `$${numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDateTime(value) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString()
}

function formatPercent(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return "0.0%"
  return `${numeric.toFixed(1)}%`
}

export default function Analytics() {
  const { positions, closedPositions, calculateRunningPnl } = useTrading()

  const uniqueClosedTrades = useMemo(() => {
    const seen = new Set()
    return closedPositions.filter((trade) => {
      const key = String(trade?.id ?? "")
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [closedPositions])

  const runningPnl = useMemo(
    () => positions.reduce((sum, position) => sum + calculateRunningPnl(position), 0),
    [calculateRunningPnl, positions]
  )

  const analytics = useMemo(() => {
    const realizedPnl = uniqueClosedTrades.reduce((sum, trade) => sum + Number(trade.closedPnl || 0), 0)
    const winningTrades = uniqueClosedTrades.filter((trade) => Number(trade.closedPnl || 0) > 0)
    const losingTrades = uniqueClosedTrades.filter((trade) => Number(trade.closedPnl || 0) < 0)
    const grossProfit = winningTrades.reduce((sum, trade) => sum + Number(trade.closedPnl || 0), 0)
    const grossLossAbs = Math.abs(losingTrades.reduce((sum, trade) => sum + Number(trade.closedPnl || 0), 0))
    const avgWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0
    const avgLoss =
      losingTrades.length > 0
        ? Math.abs(losingTrades.reduce((sum, trade) => sum + Number(trade.closedPnl || 0), 0)) / losingTrades.length
        : 0
    const winRate = uniqueClosedTrades.length > 0 ? (winningTrades.length / uniqueClosedTrades.length) * 100 : 0
    const bestTrade = uniqueClosedTrades.reduce(
      (best, trade) => (Number(trade.closedPnl || 0) > Number(best?.closedPnl || -Infinity) ? trade : best),
      null
    )
    const worstTrade = uniqueClosedTrades.reduce(
      (worst, trade) => (Number(trade.closedPnl || 0) < Number(worst?.closedPnl || Infinity) ? trade : worst),
      null
    )

    const symbolStats = Object.values(
      uniqueClosedTrades.reduce((acc, trade) => {
        const symbol = trade.symbol || "Unknown"
        if (!acc[symbol]) {
          acc[symbol] = {
            symbol,
            trades: 0,
            wins: 0,
            pnl: 0,
            volume: 0,
          }
        }

        acc[symbol].trades += 1
        acc[symbol].wins += Number(trade.closedPnl || 0) > 0 ? 1 : 0
        acc[symbol].pnl += Number(trade.closedPnl || 0)
        acc[symbol].volume += Number(trade.quantity || 0)
        return acc
      }, {})
    )
      .map((item) => ({
        ...item,
        winRate: item.trades > 0 ? (item.wins / item.trades) * 100 : 0,
      }))
      .sort((left, right) => right.pnl - left.pnl)

    const dailyPerformance = Object.values(
      uniqueClosedTrades.reduce((acc, trade) => {
        const closedAt = trade.closedAt ? new Date(trade.closedAt) : null
        const key = closedAt && !Number.isNaN(closedAt.getTime()) ? closedAt.toISOString().slice(0, 10) : "Unknown"
        if (!acc[key]) {
          acc[key] = { day: key, pnl: 0, trades: 0 }
        }
        acc[key].pnl += Number(trade.closedPnl || 0)
        acc[key].trades += 1
        return acc
      }, {})
    )
      .sort((left, right) => right.day.localeCompare(left.day))
      .slice(0, 7)

    return {
      realizedPnl,
      closedCount: uniqueClosedTrades.length,
      openCount: positions.length,
      winningCount: winningTrades.length,
      losingCount: losingTrades.length,
      winRate,
      avgWin,
      avgLoss,
      profitFactor: grossLossAbs > 0 ? grossProfit / grossLossAbs : grossProfit > 0 ? grossProfit : 0,
      bestTrade,
      worstTrade,
      symbolStats,
      dailyPerformance,
      recentClosedTrades: [...uniqueClosedTrades]
        .sort((left, right) => new Date(right.closedAt || 0) - new Date(left.closedAt || 0))
        .slice(0, 6),
    }
  }, [positions.length, uniqueClosedTrades])

  const maxDailyBarValue = useMemo(() => {
    const maxAbs = analytics.dailyPerformance.reduce((max, item) => Math.max(max, Math.abs(item.pnl)), 0)
    return maxAbs > 0 ? maxAbs : 1
  }, [analytics.dailyPerformance])

  return (
    <div className="space-y-4">
      <section className="app-surface soft-in rounded-xl p-5">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Analytics</p>
        <h1 className="mt-2 text-2xl font-bold text-white">Performance Analytics</h1>
        <p className="mt-1 text-sm text-slate-300">Review your win rate, P&amp;L distribution, and symbol-level trading performance.</p>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="app-surface soft-in rounded-xl p-4">
          <p className="text-xs text-slate-400">Realized P&amp;L</p>
          <p className={`mt-2 text-2xl font-bold ${analytics.realizedPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {formatMoney(analytics.realizedPnl)}
          </p>
        </article>
        <article className="app-surface soft-in rounded-xl p-4">
          <p className="text-xs text-slate-400">Running P&amp;L</p>
          <p className={`mt-2 text-2xl font-bold ${runningPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {formatMoney(runningPnl)}
          </p>
        </article>
        <article className="app-surface soft-in rounded-xl p-4">
          <p className="text-xs text-slate-400">Win Rate</p>
          <p className="mt-2 text-2xl font-bold text-amber-300">{formatPercent(analytics.winRate)}</p>
        </article>
        <article className="app-surface soft-in rounded-xl p-4">
          <p className="text-xs text-slate-400">Profit Factor</p>
          <p className="mt-2 text-2xl font-bold text-sky-300">{analytics.profitFactor.toFixed(2)}</p>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <article className="app-surface soft-in rounded-xl p-4">
          <h2 className="text-lg font-semibold text-white">Trade Breakdown</h2>
          <div className="mt-4 space-y-3">
            <div className="theme-soft-block rounded-lg px-4 py-3">
              <p className="text-xs text-slate-400">Closed Trades</p>
              <p className="mt-1 text-xl font-semibold text-slate-100">{analytics.closedCount}</p>
            </div>
            <div className="theme-soft-block rounded-lg px-4 py-3">
              <p className="text-xs text-slate-400">Open Trades</p>
              <p className="mt-1 text-xl font-semibold text-slate-100">{analytics.openCount}</p>
            </div>
            <div className="theme-soft-block rounded-lg px-4 py-3">
              <p className="text-xs text-slate-400">Winning / Losing</p>
              <p className="mt-1 text-xl font-semibold text-slate-100">
                <span className="text-emerald-400">{analytics.winningCount}</span> /{" "}
                <span className="text-rose-400">{analytics.losingCount}</span>
              </p>
            </div>
          </div>
        </article>

        <article className="app-surface soft-in rounded-xl p-4">
          <h2 className="text-lg font-semibold text-white">Average Outcome</h2>
          <div className="mt-4 space-y-3">
            <div className="theme-soft-block rounded-lg px-4 py-3">
              <p className="text-xs text-slate-400">Average Win</p>
              <p className="mt-1 text-xl font-semibold text-emerald-400">{formatMoney(analytics.avgWin)}</p>
            </div>
            <div className="theme-soft-block rounded-lg px-4 py-3">
              <p className="text-xs text-slate-400">Average Loss</p>
              <p className="mt-1 text-xl font-semibold text-rose-400">{formatMoney(analytics.avgLoss)}</p>
            </div>
          </div>
        </article>

        <article className="app-surface soft-in rounded-xl p-4">
          <h2 className="text-lg font-semibold text-white">Best / Worst Trade</h2>
          <div className="mt-4 space-y-3">
            <div className="theme-soft-block rounded-lg px-4 py-3">
              <p className="text-xs text-slate-400">Best Trade</p>
              <p className="mt-1 text-sm text-slate-300">{analytics.bestTrade?.symbol || "-"}</p>
              <p className="mt-1 text-xl font-semibold text-emerald-400">
                {analytics.bestTrade ? formatMoney(analytics.bestTrade.closedPnl) : "$0.00"}
              </p>
            </div>
            <div className="theme-soft-block rounded-lg px-4 py-3">
              <p className="text-xs text-slate-400">Worst Trade</p>
              <p className="mt-1 text-sm text-slate-300">{analytics.worstTrade?.symbol || "-"}</p>
              <p className="mt-1 text-xl font-semibold text-rose-400">
                {analytics.worstTrade ? formatMoney(analytics.worstTrade.closedPnl) : "$0.00"}
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="app-surface soft-in rounded-xl p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Performance By Symbol</h2>
            <span className="text-xs text-slate-400">{analytics.symbolStats.length} symbols</span>
          </div>

          {analytics.symbolStats.length === 0 ? (
            <p className="text-sm text-slate-400">No closed trades yet.</p>
          ) : (
            <div className="space-y-2">
              {analytics.symbolStats.map((item) => (
                <div key={item.symbol} className="theme-soft-block rounded-lg px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{item.symbol}</p>
                      <p className="text-xs text-slate-400">
                        Trades: {item.trades} | Win Rate: {formatPercent(item.winRate)} | Volume: {item.volume}
                      </p>
                    </div>
                    <p className={`text-sm font-semibold ${item.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {formatMoney(item.pnl)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="app-surface soft-in rounded-xl p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Last 7 Trading Days</h2>
            <span className="text-xs text-slate-400">Daily realized P&amp;L</span>
          </div>

          {analytics.dailyPerformance.length === 0 ? (
            <p className="text-sm text-slate-400">No daily performance data available yet.</p>
          ) : (
            <div className="space-y-3">
              {analytics.dailyPerformance.map((item) => {
                const width = `${Math.max(8, (Math.abs(item.pnl) / maxDailyBarValue) * 100)}%`
                return (
                  <div key={item.day}>
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                      <span>{item.day}</span>
                      <span>
                        {item.trades} trades | {formatMoney(item.pnl)}
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-800/80">
                      <div
                        className={`h-3 rounded-full ${item.pnl >= 0 ? "bg-emerald-500" : "bg-rose-500"}`}
                        style={{ width }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </article>
      </section>

      <section className="app-surface soft-in rounded-xl p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent Closed Trades</h2>
          <span className="text-xs text-slate-400">{analytics.recentClosedTrades.length} shown</span>
        </div>

        {analytics.recentClosedTrades.length === 0 ? (
          <p className="text-sm text-slate-400">Close a few trades to see recent analytics history.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs sm:text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="px-2 py-2">Order</th>
                  <th className="px-2 py-2">Pair</th>
                  <th className="px-2 py-2">Side</th>
                  <th className="px-2 py-2">Entry</th>
                  <th className="px-2 py-2">Close</th>
                  <th className="px-2 py-2">P&amp;L</th>
                  <th className="px-2 py-2">Closed At</th>
                </tr>
              </thead>
              <tbody>
                {analytics.recentClosedTrades.map((trade) => (
                  <tr key={trade.id} className="border-t border-slate-700 text-slate-200">
                    <td className="px-2 py-2">{`ORD-${String(trade.id).padStart(4, "0")}`}</td>
                    <td className="px-2 py-2">{trade.symbol}</td>
                    <td className={`px-2 py-2 ${trade.type === "BUY" ? "text-emerald-400" : "text-rose-400"}`}>
                      {trade.type}
                    </td>
                    <td className="px-2 py-2">{formatMoney(trade.entryPrice)}</td>
                    <td className="px-2 py-2">{formatMoney(trade.closePrice)}</td>
                    <td className={`px-2 py-2 font-semibold ${Number(trade.closedPnl || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {formatMoney(trade.closedPnl)}
                    </td>
                    <td className="px-2 py-2 text-slate-300">{formatDateTime(trade.closedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
