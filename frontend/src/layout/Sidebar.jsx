const navItems = [
  "Dashboard",
  "Trading",
  "Wallet",
  "Orders",
]

export default function Sidebar() {
  return (
    <aside className="hidden w-64 border-r border-slate-800 bg-slate-950 p-4 lg:block">
      <h1 className="mb-8 text-xl font-bold">MiniTrade</h1>
      <nav className="space-y-2">
        {navItems.map((item) => (
          <div key={item} className="rounded px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">
            {item}
          </div>
        ))}
      </nav>
    </aside>
  )
}
