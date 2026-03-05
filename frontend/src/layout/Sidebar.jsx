import { NavLink } from "react-router-dom"

const navItems = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Trading", to: "/trading" },
  { label: "Wallet", to: "/wallet" },
  { label: "Orders", to: "/orders" },
]

export default function Sidebar() {
  return (
    <aside className="app-surface soft-in m-3 hidden w-64 rounded-2xl p-4 lg:block">
      <h1 className="mb-1 text-xl font-bold">MiniTrade</h1>
      <p className="mb-8 text-xs text-slate-400">Demo Broker Terminal</p>
      <nav className="space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `block rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive ? "bg-sky-600 text-white shadow-[0_0_18px_rgba(14,165,233,0.38)]" : "text-slate-300 hover:bg-slate-800/80"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
