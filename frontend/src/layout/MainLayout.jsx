import { useState } from "react"
import { Outlet } from "react-router-dom"
import Sidebar from "./Sidebar"
import Navbar from "./Navbar"
import MobileNav from "./MobileNav"
import { useTrading } from "../context/TradingContext"

export default function MainLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { alertNotifications, dismissAlertNotification } = useTrading()

  const openMenu = () => setIsMenuOpen(true)
  const closeMenu = () => setIsMenuOpen(false)

  return (
    <div className="relative flex min-h-screen overflow-hidden text-slate-100">
      <div className="pointer-events-none absolute -left-16 top-16 h-44 w-44 rounded-full bg-cyan-500/10 blur-2xl" />
      <div className="pointer-events-none absolute right-0 top-52 h-60 w-60 rounded-full bg-sky-500/10 blur-3xl" />
      <Sidebar isOpen={isMenuOpen} onClose={closeMenu} />
      <main className="relative flex-1">
        <Navbar onMenuToggle={openMenu} />
        <div className="p-6 pb-24 lg:pb-6">
          <Outlet />
        </div>
      </main>
      {alertNotifications.length > 0 ? (
        <div className="pointer-events-none fixed right-4 top-20 z-[130] flex w-[min(92vw,22rem)] flex-col gap-2">
          {alertNotifications.map((notification) => (
            <div
              key={notification.id}
              className="pointer-events-auto rounded-lg border border-amber-500/30 bg-slate-900/95 p-3 shadow-[0_8px_30px_rgba(2,6,23,0.55)]"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-amber-300">Price Alert Triggered</p>
                <button
                  type="button"
                  onClick={() => dismissAlertNotification(notification.id)}
                  className="rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-300 hover:bg-slate-700"
                >
                  X
                </button>
              </div>
              <p className="mt-1 text-sm text-slate-200">{notification.message}</p>
            </div>
          ))}
        </div>
      ) : null}
      <MobileNav />
    </div>
  )
}
