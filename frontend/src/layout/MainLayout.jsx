import { useState } from "react"
import { Outlet } from "react-router-dom"
import Sidebar from "./Sidebar"
import Navbar from "./Navbar"

export default function MainLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const openMenu = () => setIsMenuOpen(true)
  const closeMenu = () => setIsMenuOpen(false)

  return (
    <div className="relative flex min-h-screen overflow-hidden text-slate-100">
      <div className="pointer-events-none absolute -left-16 top-16 h-44 w-44 rounded-full bg-cyan-500/10 blur-2xl" />
      <div className="pointer-events-none absolute right-0 top-52 h-60 w-60 rounded-full bg-sky-500/10 blur-3xl" />
      <Sidebar isOpen={isMenuOpen} onClose={closeMenu} />
      <main className="relative flex-1">
        <Navbar onMenuToggle={openMenu} />
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
