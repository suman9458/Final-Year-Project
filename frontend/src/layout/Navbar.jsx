import { useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import { useTrading } from "../context/TradingContext"

function formatMoney(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return "0.00"
  return numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function Navbar({ onMenuToggle }) {
  const { user } = useAuth()
  const { demoBalance } = useTrading()
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark"
    return window.localStorage.getItem("tradeone-theme") || "dark"
  })

  useEffect(() => {
    if (typeof document === "undefined") return
    document.documentElement.setAttribute("data-theme", theme)
    window.localStorage.setItem("tradeone-theme", theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"))
  }

  return (
    <header className="soft-in relative z-110 m-3 mb-0 flex items-center justify-between rounded-2xl border border-slate-700/60 bg-slate-900/80 px-4 py-3 backdrop-blur">
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
        <div className="flex items-center gap-2">
          <img
            src="/l0go.png"
            alt="TradeOne logo"
            className="h-7 w-7 rounded-full object-cover ring-1 ring-slate-600/70"
          />
          <div>
            <h2 className="text-sm font-semibold text-slate-200 lg:text-base">TradeOne</h2>
            <p className="text-[11px] text-slate-400">Paper Trading Environment</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-2 lg:flex">
          <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-300">
            Balance ${formatMoney(demoBalance)}
          </span>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-700"
        >
          {theme === "dark" ? "Light" : "Dark"}
        </button>
        <span className="hidden text-sm text-slate-400 sm:inline">{user?.name ?? "User"}</span>
      </div>
    </header>
  )
}
