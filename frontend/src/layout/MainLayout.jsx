import { Outlet } from "react-router-dom"
import Sidebar from "./Sidebar"
import Navbar from "./Navbar"

export default function MainLayout() {
  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-100">
      <Sidebar />
      <main className="flex-1">
        <Navbar />
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
