import { useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const navItems = [
    { label: "Dashboard", to: "/dashboard" },
    { label: "Trading", to: "/trading" },
    { label: "Alerts", to: "/alerts" },
    { label: "Wallet", to: "/wallet" },
    { label: "Orders", to: "/orders" },
    { label: "Settings", to: "/settings" },
    ...(user?.role === "admin" ? [{ label: "Admin", to: "/admin" }] : []),
  ]

  const handleLogout = () => {
    logout()
    onClose()
    navigate("/login", { replace: true })
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close menu overlay"
        onClick={onClose}
        className={`fixed inset-0 z-[115] bg-black/40 transition ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`app-surface pointer-events-auto fixed left-3 top-3 z-[120] h-[calc(100vh-1.5rem)] w-72 rounded-2xl p-4 transition-transform ${
          isOpen ? "translate-x-0" : "-translate-x-[120%]"
        }`}
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="mb-1 text-xl font-bold">TradeOne</h1>
            <p className="text-xs text-slate-400">Paper Trading Terminal</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700"
          >
            X
          </button>
        </div>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <a
              key={item.to}
              href={item.to}
              onClick={onClose}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                location.pathname === item.to
                  ? "bg-sky-600 text-white shadow-[0_0_18px_rgba(14,165,233,0.38)]"
                  : "text-slate-300 hover:bg-slate-800/80"
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="mt-6 border-t border-slate-700/70 pt-4">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-left text-sm font-semibold text-slate-200 hover:bg-slate-700"
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  )
}
