import { useMemo, useState } from "react"

export default function OrderPanel() {
  const [type, setType] = useState("BUY")
  const [quantity, setQuantity] = useState("")

  const symbol = "BTC / USDT"
  const price = 50000

  const estimatedPnl = useMemo(() => {
    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty <= 0) return "0.00"

    const move = price * qty * 0.02
    return (type === "BUY" ? move : -move).toFixed(2)
  }, [price, quantity, type])

  return (
    <div className="rounded-lg bg-slate-800 p-4">
      <h2 className="mb-1 text-lg font-semibold">{symbol}</h2>
      <p className="mb-4 text-sm text-slate-300">Price: ${price.toLocaleString()}</p>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setType("BUY")}
          className={`rounded p-2 font-medium transition ${
            type === "BUY" ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-200"
          }`}
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => setType("SELL")}
          className={`rounded p-2 font-medium transition ${
            type === "SELL" ? "bg-rose-600 text-white" : "bg-slate-700 text-slate-200"
          }`}
        >
          Sell
        </button>
      </div>

      <div className="mb-4">
        <label htmlFor="quantity" className="text-sm text-slate-300">
          Quantity
        </label>
        <input
          id="quantity"
          type="number"
          min="0"
          step="0.001"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="0.00"
          className="mt-1 w-full rounded border border-slate-600 bg-slate-700 p-2 text-white outline-none ring-0 placeholder:text-slate-400 focus:border-sky-500"
        />
      </div>

      <div className="mb-4 flex items-center justify-between rounded bg-slate-900 px-3 py-2 text-sm">
        <span className="text-slate-300">Estimated P&L</span>
        <span className={`font-semibold ${Number(estimatedPnl) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
          ${estimatedPnl}
        </span>
      </div>

      <button
        type="button"
        className={`w-full rounded p-2 font-semibold ${
          type === "BUY" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"
        }`}
      >
        Place {type} Order
      </button>
    </div>
  )
}
