import { useTrading } from "../context/TradingContext"

export default function Orders() {
  const { positions, closedPositions, getCurrentPrice, calculateRunningPnl } = useTrading()

  const hasRows = positions.length > 0 || closedPositions.length > 0

  return (
    <div className="space-y-4">
      <section className="app-surface soft-in rounded-xl p-5">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Orders</p>
        <h1 className="mt-2 text-2xl font-bold text-white">Order History</h1>
        <p className="mt-1 text-sm text-slate-300">Open and closed demo positions.</p>
      </section>

      <section className="app-surface soft-in rounded-xl p-4">
        {!hasRows ? (
          <p className="text-sm text-slate-400">No orders available. Place orders from Trading page.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs sm:text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="px-2 py-2">Order ID</th>
                  <th className="px-2 py-2">Pair</th>
                  <th className="px-2 py-2">Side</th>
                  <th className="px-2 py-2">Qty</th>
                  <th className="px-2 py-2">Entry</th>
                  <th className="px-2 py-2">SL</th>
                  <th className="px-2 py-2">TP</th>
                  <th className="px-2 py-2">Current</th>
                  <th className="px-2 py-2">P&L</th>
                  <th className="px-2 py-2">Close Reason</th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position) => {
                  const currentPrice = getCurrentPrice(position.symbol)
                  const pnl = calculateRunningPnl(position)

                  return (
                    <tr key={position.id} className="border-t border-slate-700 text-slate-200">
                      <td className="px-2 py-2">ORD-{String(position.id).padStart(4, "0")}</td>
                      <td className="px-2 py-2">{position.symbol}</td>
                      <td className={`px-2 py-2 ${position.type === "BUY" ? "text-emerald-400" : "text-rose-400"}`}>
                        {position.type}
                      </td>
                      <td className="px-2 py-2">{position.quantity}</td>
                      <td className="px-2 py-2">${position.entryPrice.toLocaleString()}</td>
                      <td className="px-2 py-2">{position.stopLoss ? `$${position.stopLoss.toLocaleString()}` : "-"}</td>
                      <td className="px-2 py-2">{position.takeProfit ? `$${position.takeProfit.toLocaleString()}` : "-"}</td>
                      <td className="px-2 py-2">${currentPrice.toLocaleString()}</td>
                      <td className={`px-2 py-2 font-semibold ${pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        ${pnl.toFixed(2)}
                      </td>
                      <td className="px-2 py-2 text-slate-400">-</td>
                      <td className="px-2 py-2">
                        <span className="rounded-full bg-sky-500/20 px-2 py-1 text-xs text-sky-300">Open</span>
                      </td>
                    </tr>
                  )
                })}
                {closedPositions.map((position) => (
                  <tr key={`closed-${position.id}-${position.closedAt}`} className="border-t border-slate-700 text-slate-200">
                    <td className="px-2 py-2">ORD-{String(position.id).padStart(4, "0")}</td>
                    <td className="px-2 py-2">{position.symbol}</td>
                    <td className={`px-2 py-2 ${position.type === "BUY" ? "text-emerald-400" : "text-rose-400"}`}>
                      {position.type}
                    </td>
                    <td className="px-2 py-2">{position.quantity}</td>
                    <td className="px-2 py-2">${position.entryPrice.toLocaleString()}</td>
                    <td className="px-2 py-2">{position.stopLoss ? `$${position.stopLoss.toLocaleString()}` : "-"}</td>
                    <td className="px-2 py-2">{position.takeProfit ? `$${position.takeProfit.toLocaleString()}` : "-"}</td>
                    <td className="px-2 py-2">${position.closePrice.toLocaleString()}</td>
                    <td className={`px-2 py-2 font-semibold ${position.closedPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      ${position.closedPnl.toFixed(2)}
                    </td>
                    <td className="px-2 py-2 text-slate-300">{position.closeReason || "Manual Close"}</td>
                    <td className="px-2 py-2">
                      <span className="rounded-full bg-slate-500/20 px-2 py-1 text-xs text-slate-300">Closed</span>
                    </td>
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
