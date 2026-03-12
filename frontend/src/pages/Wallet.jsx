import { useEffect, useMemo, useState } from "react"
import { useTrading } from "../context/TradingContext"
import { createWalletRequest, fetchMyWalletRequests } from "../services/tradingService"

export default function Wallet() {
  const { demoBalance, totalRunningPnl, accountEquity, walletTransactions, addDemoFunds, withdrawDemoFunds, resetDemoAccount } =
    useTrading()
  const [message, setMessage] = useState("")
  const [requestType, setRequestType] = useState("deposit")
  const [requestAmount, setRequestAmount] = useState("")
  const [requestNote, setRequestNote] = useState("")
  const [walletRequests, setWalletRequests] = useState([])
  const [walletRequestError, setWalletRequestError] = useState("")
  const [isLoadingRequests, setIsLoadingRequests] = useState(true)
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false)

  const pendingCount = useMemo(
    () => walletRequests.filter((item) => String(item.status || "").toLowerCase() === "pending").length,
    [walletRequests]
  )

  useEffect(() => {
    let isCancelled = false
    async function loadRequests() {
      setIsLoadingRequests(true)
      setWalletRequestError("")
      try {
        const items = await fetchMyWalletRequests()
        if (!isCancelled) setWalletRequests(items)
      } catch (error) {
        if (!isCancelled) {
          setWalletRequestError(error?.message || "Failed to load wallet requests.")
        }
      } finally {
        if (!isCancelled) setIsLoadingRequests(false)
      }
    }
    loadRequests()
    return () => {
      isCancelled = true
    }
  }, [])

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

  const handleReset = () => {
    resetDemoAccount()
    setMessage("Demo account reset to initial $10,000.")
  }

  const handleSubmitRequest = async (event) => {
    event.preventDefault()
    setWalletRequestError("")
    const amount = Number(requestAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setWalletRequestError("Enter a valid amount greater than 0.")
      return
    }
    setIsSubmittingRequest(true)
    try {
      const created = await createWalletRequest({
        requestType,
        amount,
        note: requestNote,
      })
      setWalletRequests((prev) => [created, ...prev])
      setRequestAmount("")
      setRequestNote("")
    } catch (error) {
      setWalletRequestError(error?.message || "Failed to create request.")
    } finally {
      setIsSubmittingRequest(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className="app-surface soft-in rounded-xl p-5">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Wallet</p>
        <h1 className="mt-2 text-2xl font-bold text-white">Current Balance (Live)</h1>
        <p className={`mt-3 text-4xl font-bold ${accountEquity >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
          ${accountEquity.toFixed(2)}
        </p>
        <p className="mt-1 text-sm text-slate-300">Currency: USD</p>
        <div className="mt-4 grid gap-3 rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Cash Balance (Realized)</p>
            <p className={`mt-1 font-semibold ${demoBalance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              ${demoBalance.toFixed(2)}
            </p>
          </div>
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

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
        <button
          type="button"
          onClick={handleReset}
          className="rounded-xl bg-slate-700 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-600"
        >
          Reset Demo Account
        </button>
      </section>

      <section className="app-surface soft-in rounded-xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300">Deposit/Withdraw Requests</h2>
          <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">Pending: {pendingCount}</span>
        </div>
        <form onSubmit={handleSubmitRequest} className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <select
            value={requestType}
            onChange={(event) => setRequestType(event.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            <option value="deposit">Deposit</option>
            <option value="withdraw">Withdraw</option>
          </select>
          <input
            type="number"
            min="1"
            step="0.01"
            value={requestAmount}
            onChange={(event) => setRequestAmount(event.target.value)}
            placeholder="Amount"
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          />
          <input
            type="text"
            value={requestNote}
            onChange={(event) => setRequestNote(event.target.value)}
            placeholder="Note (optional)"
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          />
          <button
            type="submit"
            disabled={isSubmittingRequest}
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
          >
            {isSubmittingRequest ? "Submitting..." : "Submit Request"}
          </button>
        </form>
        {walletRequestError ? <p className="mt-2 text-xs text-rose-400">{walletRequestError}</p> : null}
      </section>

      <section className="app-surface soft-in rounded-xl p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">Request History</h2>
        {isLoadingRequests ? (
          <p className="text-sm text-slate-400">Loading requests...</p>
        ) : walletRequests.length === 0 ? (
          <p className="text-sm text-slate-400">No requests yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs sm:text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="px-2 py-2">Type</th>
                  <th className="px-2 py-2">Amount</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Note</th>
                  <th className="px-2 py-2">Review Note</th>
                </tr>
              </thead>
              <tbody>
                {walletRequests.map((item) => (
                  <tr key={item.id} className="border-t border-slate-700 text-slate-200">
                    <td className="px-2 py-2 capitalize">{item.requestType}</td>
                    <td className="px-2 py-2">${Number(item.amount || 0).toFixed(2)}</td>
                    <td className="px-2 py-2 capitalize">{item.status}</td>
                    <td className="px-2 py-2">{item.note || "-"}</td>
                    <td className="px-2 py-2">{item.reviewNote || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
