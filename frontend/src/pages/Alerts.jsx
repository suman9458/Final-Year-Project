import { useMemo, useState } from "react"
import { useTrading } from "../context/TradingContext"

function formatPrice(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return "-"
  if (numeric >= 1000) return numeric.toLocaleString(undefined, { maximumFractionDigits: 2 })
  if (numeric >= 1) return numeric.toLocaleString(undefined, { maximumFractionDigits: 4 })
  return numeric.toLocaleString(undefined, { maximumFractionDigits: 6 })
}

export default function Alerts() {
  const { markets, selectedMarket, priceAlerts, createPriceAlert, removePriceAlert, reactivatePriceAlert } = useTrading()
  const [pair, setPair] = useState(selectedMarket?.pair || markets[0]?.pair || "")
  const [direction, setDirection] = useState("above")
  const [targetPrice, setTargetPrice] = useState("")
  const [error, setError] = useState("")

  const selectedPairMarket = useMemo(() => markets.find((item) => item.pair === pair) || markets[0], [markets, pair])

  const handleCreate = () => {
    setError("")
    const target = Number(targetPrice)
    const result = createPriceAlert({
      pair: selectedPairMarket?.pair,
      symbol: selectedPairMarket?.symbol,
      direction,
      targetPrice: target,
    })
    if (!result?.ok) {
      setError(result?.error || "Unable to create alert.")
      return
    }
    setTargetPrice("")
  }

  return (
    <div className="space-y-4">
      <section className="app-surface soft-in rounded-xl p-5">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Alerts</p>
        <h1 className="mt-2 text-2xl font-bold text-white">Price Alerts</h1>
        <p className="mt-1 text-sm text-slate-300">Create trigger alerts for your markets.</p>
      </section>

      <section className="app-surface soft-in rounded-xl p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <select
            value={pair}
            onChange={(e) => setPair(e.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
          >
            {markets.map((market) => (
              <option key={market.pair} value={market.pair}>
                {market.symbol}
              </option>
            ))}
          </select>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
          >
            <option value="above">Price Above</option>
            <option value="below">Price Below</option>
          </select>
          <input
            type="number"
            inputMode="decimal"
            step="any"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            placeholder={`Target (current ${formatPrice(selectedPairMarket?.price)})`}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-400 focus:border-sky-500"
          />
          <button
            type="button"
            onClick={handleCreate}
            className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-500"
          >
            Add Alert
          </button>
        </div>
        {error ? <p className="mt-2 text-sm text-rose-400">{error}</p> : null}
      </section>

      <section className="app-surface soft-in rounded-xl p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">Alert List</h2>
        {priceAlerts.length === 0 ? (
          <p className="text-sm text-slate-400">No alerts created yet.</p>
        ) : (
          <div className="space-y-2">
            {priceAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex flex-col gap-2 rounded-lg border border-slate-700 bg-slate-900/70 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-100">
                    {alert.symbol} | {alert.direction === "above" ? "Above" : "Below"} ${formatPrice(alert.targetPrice)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {alert.isActive
                      ? "Active"
                      : alert.triggeredAt
                        ? `Triggered at ${new Date(alert.triggeredAt).toLocaleString()}`
                        : "Inactive"}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!alert.isActive ? (
                    <button
                      type="button"
                      onClick={() => reactivatePriceAlert(alert.id)}
                      className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
                    >
                      Reactivate
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => removePriceAlert(alert.id)}
                    className="rounded-md bg-rose-600 px-2 py-1 text-xs font-semibold text-white hover:bg-rose-500"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

