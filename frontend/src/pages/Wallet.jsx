import { useState } from "react"
import { useTrading } from "../context/TradingContext"

export default function Wallet() {
  const { demoBalance, totalRunningPnl, accountEquity, walletTransactions, addDemoFunds, withdrawDemoFunds } = useTrading()
  const [message, setMessage] = useState("")

  const handleAddFunds = () => {
    addDemoFunds(1000)
    setMessage("Added $1000 demo funds.")
  }

  const handleWithdrawFunds = () => {
    const ok = withdrawDemoFunds(500)
    if (!ok) {
      setMessage("Insufficient balance for $500 withdrawal.")
      return
    }
    setMessage("Withdrawn $500 demo funds.")
  }

  return (
    <div className="space-y-4">
      <section className="app-surface soft-in rounded-xl p-5">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Wallet</p>
        <h1 className="mt-2 text-2xl font-bold text-white">Demo Balance</h1>
        <p className={`mt-3 text-4xl font-bold ${demoBalance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
          ${demoBalance.toFixed(2)}
        </p>
        <p className="mt-1 text-sm text-slate-300">Currency: USD</p>
        <div className="mt-4 grid gap-3 rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Running P&L</p>
            <p className={`mt-1 font-semibold ${totalRunningPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              ${totalRunningPnl.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Equity (Live)</p>
            <p className={`mt-1 font-semibold ${accountEquity >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              ${accountEquity.toFixed(2)}
            </p>
          </div>
        </div>
        {message ? <p className="mt-2 text-xs text-slate-300">{message}</p> : null}
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleAddFunds}
          className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          Add Funds (Demo +$1000)
        </button>
        <button
          type="button"
          onClick={handleWithdrawFunds}
          className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-500"
        >
          Withdraw (Demo -$500)
        </button>
      </section>

      <section className="app-surface soft-in rounded-xl p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">Transactions</h2>
        {walletTransactions.length === 0 ? (
          <p className="text-sm text-slate-400">No wallet transactions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs sm:text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="px-2 py-2">ID</th>
                  <th className="px-2 py-2">Type</th>
                  <th className="px-2 py-2">Amount</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {walletTransactions.map((item) => (
                  <tr key={`${item.id}-${item.createdAt}`} className="border-t border-slate-700 text-slate-200">
                    <td className="px-2 py-2">{item.id}</td>
                    <td className="px-2 py-2">{item.type}</td>
                    <td className={`px-2 py-2 ${item.amount >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      ${item.amount.toFixed(2)}
                    </td>
                    <td className="px-2 py-2">{item.status}</td>
                    <td className="px-2 py-2 text-slate-300">{item.note || "-"}</td>
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
