import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function Navbar({ onMenuToggle }) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

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
        <h2 className="text-sm font-semibold text-slate-200 lg:text-base">Trading Platform</h2>
        <p className="text-[11px] text-slate-400">Paper Trading Environment</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
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
