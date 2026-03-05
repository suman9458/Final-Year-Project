import { useMemo, useState } from "react"

export default function OrderPanel({ symbol, price, onPlaceOrder }) {
  const [type, setType] = useState("BUY")
  const [quantity, setQuantity] = useState("")
  const [stopLoss, setStopLoss] = useState("")
  const [takeProfit, setTakeProfit] = useState("")
  const [error, setError] = useState("")

  const estimatedPnl = useMemo(() => {
    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty <= 0) return "0.00"

    const move = price * qty * 0.02
    return (type === "BUY" ? move : -move).toFixed(2)
  }, [price, quantity, type])

  const handlePlaceOrder = () => {
    const qty = Number(quantity)
    const sl = stopLoss === "" ? null : Number(stopLoss)
    const tp = takeProfit === "" ? null : Number(takeProfit)

    if (!Number.isFinite(qty) || qty <= 0) {
      setError("Enter a quantity greater than 0.")
      return
    }
    if (qty > 1000) {
      setError("Quantity is too large for demo mode (max: 1000).")
      return
    }
    if (sl !== null && (!Number.isFinite(sl) || sl <= 0)) {
      setError("Stop Loss must be a valid positive number.")
      return
    }
    if (tp !== null && (!Number.isFinite(tp) || tp <= 0)) {
      setError("Take Profit must be a valid positive number.")
      return
    }
    if (type === "BUY") {
      if (sl !== null && sl >= price) {
        setError("For BUY, Stop Loss must be below entry price.")
        return
      }
      if (tp !== null && tp <= price) {
        setError("For BUY, Take Profit must be above entry price.")
        return
      }
    } else {
      if (sl !== null && sl <= price) {
        setError("For SELL, Stop Loss must be above entry price.")
        return
      }
      if (tp !== null && tp >= price) {
        setError("For SELL, Take Profit must be below entry price.")
        return
      }
    }

    onPlaceOrder({
      symbol,
      type,
      quantity: qty,
      entryPrice: price,
      stopLoss: sl,
      takeProfit: tp,
    })
    setError("")
    setQuantity("")
    setStopLoss("")
    setTakeProfit("")
  }

  return (
    <div className="app-surface soft-in rounded-xl p-4">
      <h2 className="mb-1 text-lg font-semibold">{symbol}</h2>
      <p className="mb-4 text-sm text-slate-300">
        Market Price <span className="ml-1 font-semibold text-white">${price.toLocaleString()}</span>
      </p>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setType("BUY")}
          className={`rounded-lg p-2 font-semibold transition ${
            type === "BUY" ? "bg-emerald-600 text-white shadow-[0_0_16px_rgba(16,185,129,0.35)]" : "bg-slate-700 text-slate-200"
          }`}
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => setType("SELL")}
          className={`rounded-lg p-2 font-semibold transition ${
            type === "SELL" ? "bg-rose-600 text-white shadow-[0_0_16px_rgba(244,63,94,0.32)]" : "bg-slate-700 text-slate-200"
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
          onChange={(e) => {
            setQuantity(e.target.value)
            if (error) setError("")
          }}
          placeholder="0.00"
          className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 p-2 text-white outline-none ring-0 placeholder:text-slate-400 focus:border-sky-500"
        />
        {error ? <p className="mt-1 text-xs text-rose-400">{error}</p> : null}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="stopLoss" className="text-sm text-slate-300">
            Stop Loss (Optional)
          </label>
          <input
            id="stopLoss"
            type="number"
            min="0"
            step="0.01"
            value={stopLoss}
            onChange={(e) => {
              setStopLoss(e.target.value)
              if (error) setError("")
            }}
            placeholder="e.g. 65000"
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 p-2 text-white outline-none ring-0 placeholder:text-slate-400 focus:border-sky-500"
          />
        </div>
        <div>
          <label htmlFor="takeProfit" className="text-sm text-slate-300">
            Take Profit (Optional)
          </label>
          <input
            id="takeProfit"
            type="number"
            min="0"
            step="0.01"
            value={takeProfit}
            onChange={(e) => {
              setTakeProfit(e.target.value)
              if (error) setError("")
            }}
            placeholder="e.g. 70000"
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 p-2 text-white outline-none ring-0 placeholder:text-slate-400 focus:border-sky-500"
          />
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm">
        <span className="text-slate-300">Estimated P&L</span>
        <span className={`font-semibold ${Number(estimatedPnl) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
          ${estimatedPnl}
        </span>
      </div>

      <button
        type="button"
        onClick={handlePlaceOrder}
        className={`w-full rounded-lg p-2 font-semibold ${
          type === "BUY" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"
        }`}
      >
        Place {type} Order
      </button>
    </div>
  )
}
