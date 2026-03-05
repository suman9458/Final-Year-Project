import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { useTrading } from "../context/TradingContext"

function formatMoney(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return "0.00"
  return numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function Navbar({ onMenuToggle }) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { demoBalance, totalRunningPnl, accountEquity } = useTrading()

  const handleLogout = () => {
    logout()
    navigate("/login", { replace: true })
  }

  return (
    <header className="soft-in m-3 mb-0 flex items-center justify-between rounded-2xl border border-slate-700/60 bg-slate-900/80 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          aria-label="Open menu"
          className="rounded-lg bg-slate-800 p-2 text-slate-200 hover:bg-slate-700"
        >
          <span className="block h-0.5 w-4 bg-current" />
          <span className="mt-1 block h-0.5 w-4 bg-current" />
          <span className="mt-1 block h-0.5 w-4 bg-current" />
        </button>
        <div>
        <h2 className="text-sm font-semibold text-slate-200 lg:text-base">TradeOne</h2>
        <p className="text-[11px] text-slate-400">Paper Trading Environment</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 lg:flex">
          <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-300">
            Balance ${formatMoney(demoBalance)}
          </span>
          <span
            className={`rounded-md border px-2 py-1 text-[11px] ${
              totalRunningPnl >= 0
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-rose-500/40 bg-rose-500/10 text-rose-300"
            }`}
          >
            P&L {totalRunningPnl >= 0 ? "+" : ""}${formatMoney(totalRunningPnl)}
          </span>
          <span
            className={`rounded-md border px-2 py-1 text-[11px] ${
              accountEquity >= 0
                ? "border-sky-500/40 bg-sky-500/10 text-sky-300"
                : "border-rose-500/40 bg-rose-500/10 text-rose-300"
            }`}
          >
            Equity ${formatMoney(accountEquity)}
          </span>
        </div>
        <span className="hidden text-sm text-slate-400 sm:inline">{user?.name ?? "User"}</span>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700 sm:text-sm"
        >
          Logout
        </button>
      </div>
    </header>
  )
}
