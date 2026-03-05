import OrderPanel from "../components/OrderPanel"
import TradingChart from "../components/TradingChart"
import { useTrading } from "../context/TradingContext"

function formatPrice(value) {
  if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
  if (value >= 1) return value.toLocaleString(undefined, { maximumFractionDigits: 4 })
  return value.toLocaleString(undefined, { maximumFractionDigits: 6 })
}

export default function Trading() {
  const {
    markets,
    selectedMarket,
    setSelectedMarket,
    marketConnectionStatus,
    positions,
    placeOrder,
    closePosition,
    getCurrentPrice,
    calculateRunningPnl,
  } = useTrading()

  const isLive = marketConnectionStatus === "connected"

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
      <section className="app-surface soft-in rounded-xl p-4">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-300">Market List</h3>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
              isLive ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
            }`}
          >
            {isLive ? "Live" : "Reconnecting"}
          </span>
        </div>
        <p className="mb-3 text-xs text-slate-400">Select a pair to trade</p>
        <div className="space-y-2">
          {markets.map((market) => (
            <button
              key={market.pair}
              type="button"
              onClick={() => setSelectedMarket(market)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                selectedMarket.symbol === market.symbol
                  ? "bg-sky-600 text-white shadow-[0_0_14px_rgba(14,165,233,0.34)]"
                  : "bg-slate-700 text-slate-200 hover:bg-slate-600"
              }`}
            >
              <span>{market.symbol}</span>
              <span>${formatPrice(market.price)}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="app-surface soft-in rounded-xl p-4 lg:col-span-2 lg:min-h-96">
        <h3 className="mb-2 text-sm font-semibold text-slate-300">Chart Area</h3>
        <TradingChart pair={selectedMarket.pair} symbol={selectedMarket.symbol} />
      </section>
      <section>
        <OrderPanel symbol={selectedMarket.symbol} price={selectedMarket.price} onPlaceOrder={placeOrder} />
      </section>
      <section className="app-surface soft-in rounded-xl p-4 lg:col-span-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-300">Open Positions</h3>
        {positions.length === 0 ? (
          <p className="text-sm text-slate-400">No open positions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs sm:text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="px-2 py-2">#</th>
                  <th className="px-2 py-2">Symbol</th>
                  <th className="px-2 py-2">Type</th>
                  <th className="px-2 py-2">Qty</th>
                  <th className="px-2 py-2">Entry Price</th>
                  <th className="px-2 py-2">SL</th>
                  <th className="px-2 py-2">TP</th>
                  <th className="px-2 py-2">Current Price</th>
                  <th className="px-2 py-2">Running P&L</th>
                  <th className="px-2 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position) => {
                  const currentPrice = getCurrentPrice(position.symbol)
                  const runningPnl = calculateRunningPnl(position)

                  return (
                    <tr key={position.id} className="border-t border-slate-700 text-slate-200">
                      <td className="px-2 py-2">{position.id}</td>
                      <td className="px-2 py-2">{position.symbol}</td>
                      <td className={`px-2 py-2 ${position.type === "BUY" ? "text-emerald-400" : "text-rose-400"}`}>
                        {position.type}
                      </td>
                      <td className="px-2 py-2">{position.quantity}</td>
                      <td className="px-2 py-2">${formatPrice(position.entryPrice)}</td>
                      <td className="px-2 py-2">
                        {position.stopLoss ? `$${formatPrice(position.stopLoss)}` : <span className="text-slate-500">-</span>}
                      </td>
                      <td className="px-2 py-2">
                        {position.takeProfit ? (
                          `$${formatPrice(position.takeProfit)}`
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-2 py-2">${formatPrice(currentPrice)}</td>
                      <td className={`px-2 py-2 ${runningPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        ${runningPnl.toFixed(2)}
                      </td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => closePosition(position.id, { reason: "Manual Close" })}
                          className="rounded-md bg-rose-600 px-2 py-1 text-xs font-semibold text-white hover:bg-rose-500"
                        >
                          Close Trade
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
