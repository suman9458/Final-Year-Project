import { useEffect, useRef, useState } from "react"
import { useAuth } from "../context/AuthContext"
import { useTrading } from "../context/TradingContext"

function formatMoney(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return "0.00"
  return numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function Navbar({ onMenuToggle }) {
  const { user } = useAuth()
  const { accountEquity, notifications, unreadNotificationsCount, dismissNotification, markAllNotificationsRead } =
    useTrading()
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark"
    return window.localStorage.getItem("tradeone-theme") || "dark"
  })
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const notificationsRef = useRef(null)

  useEffect(() => {
    if (typeof document === "undefined") return
    document.documentElement.setAttribute("data-theme", theme)
    window.localStorage.setItem("tradeone-theme", theme)
  }, [theme])

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!notificationsRef.current?.contains(event.target)) {
        setIsNotificationsOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [])

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
            Balance ${formatMoney(accountEquity)}
          </span>
        </div>
        <div ref={notificationsRef} className="relative">
          <button
            type="button"
            onClick={() => setIsNotificationsOpen((prev) => !prev)}
            className="relative rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-slate-200 hover:bg-slate-700"
            aria-label="Open notifications"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
              <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
              <path d="M10 20a2 2 0 0 0 4 0" />
            </svg>
            {unreadNotificationsCount > 0 ? (
              <span className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 text-[10px] font-semibold text-white">
                {unreadNotificationsCount}
              </span>
            ) : null}
          </button>

          {isNotificationsOpen ? (
            <div className="app-surface absolute right-0 top-11 z-120 w-[min(92vw,24rem)] rounded-xl p-3 shadow-[0_18px_60px_rgba(2,6,23,0.22)] backdrop-blur">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-100">Notifications</p>
                  <p className="text-xs text-slate-400">{notifications.length} recent events</p>
                </div>
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-700"
                >
                  Mark all read
                </button>
              </div>

              {notifications.length === 0 ? (
                <p className="theme-soft-block rounded-lg px-3 py-4 text-sm text-slate-400">
                  No notifications yet.
                </p>
              ) : (
                <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {notifications.map((notification) => {
                    const toneClass =
                      notification.tone === "success"
                        ? "border-emerald-500/20"
                        : notification.tone === "danger"
                          ? "border-rose-500/20"
                          : notification.tone === "warning"
                            ? "border-amber-500/20"
                            : "border-sky-500/20"

                    return (
                      <div
                        key={notification.id}
                        className={`theme-soft-block rounded-lg p-3 ${toneClass} ${
                          notification.isRead ? "opacity-80" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-100">{notification.title}</p>
                            <p className="mt-1 text-xs text-slate-300">{notification.message}</p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              {new Date(notification.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => dismissNotification(notification.id)}
                            className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300 hover:bg-slate-700"
                          >
                            X
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : null}
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
