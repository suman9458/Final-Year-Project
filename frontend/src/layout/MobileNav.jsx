import { useLocation } from "react-router-dom"

const navItems = [
  { label: "Home", to: "/dashboard" },
  { label: "Trade", to: "/trading" },
  { label: "Alerts", to: "/alerts" },
  { label: "Wallet", to: "/wallet" },
  { label: "Orders", to: "/orders" },
  { label: "Set", to: "/settings" },
]

export default function MobileNav() {
  const location = useLocation()

  return (
    <nav className="app-surface fixed bottom-3 left-1/2 z-[120] w-[calc(100%-1.5rem)] -translate-x-1/2 rounded-xl p-1 lg:hidden">
      <div className="grid grid-cols-6 gap-1">
        {navItems.map((item) => (
          <a
            key={item.to}
            href={item.to}
            className={`rounded-lg px-2 py-2 text-center text-xs font-semibold transition ${
              location.pathname === item.to ? "bg-sky-600 text-white" : "text-slate-300"
            }`}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  )
}
