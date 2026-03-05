import { NavLink } from "react-router-dom"

const navItems = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Trading", to: "/trading" },
  { label: "Wallet", to: "/wallet" },
  { label: "Orders", to: "/orders" },
]

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      <button
        type="button"
        aria-label="Close menu overlay"
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-black/40 transition ${isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <aside
        className={`app-surface fixed left-3 top-3 z-40 h-[calc(100vh-1.5rem)] w-72 rounded-2xl p-4 transition-transform ${
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
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-sky-600 text-white shadow-[0_0_18px_rgba(14,165,233,0.38)]"
                    : "text-slate-300 hover:bg-slate-800/80"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}
