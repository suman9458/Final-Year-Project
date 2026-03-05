import { NavLink } from "react-router-dom"

const navItems = [
  { label: "Home", to: "/dashboard" },
  { label: "Trade", to: "/trading" },
  { label: "Wallet", to: "/wallet" },
  { label: "Orders", to: "/orders" },
]

export default function MobileNav() {
  return (
    <nav className="app-surface fixed bottom-3 left-1/2 z-30 w-[calc(100%-1.5rem)] -translate-x-1/2 rounded-xl p-1 lg:hidden">
      <div className="grid grid-cols-4 gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `rounded-lg px-2 py-2 text-center text-xs font-semibold transition ${
                isActive ? "bg-sky-600 text-white" : "text-slate-300"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
