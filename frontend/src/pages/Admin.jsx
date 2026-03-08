import { useEffect, useMemo, useState } from "react"
import { fetchAdminStats, fetchAdminUsers, updateUserBlockedStatus } from "../services/adminService"
import { useAuth } from "../context/AuthContext"

export default function Admin() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [updatingUserId, setUpdatingUserId] = useState("")

  const nonAdminUsers = useMemo(() => users.filter((item) => item.role !== "admin"), [users])

  const loadData = async () => {
    setIsLoading(true)
    setError("")
    try {
      const [statsData, usersData] = await Promise.all([fetchAdminStats(), fetchAdminUsers()])
      setStats(statsData)
      setUsers(usersData)
    } catch (err) {
      setError(err.message || "Failed to load admin data.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleToggleBlock = async (targetUser) => {
    setError("")
    setUpdatingUserId(targetUser.id)
    try {
      const updated = await updateUserBlockedStatus(targetUser.id, !targetUser.isBlocked)
      setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      setStats((prev) => {
        if (!prev) return prev
        const blockedDelta = updated.isBlocked ? 1 : -1
        return {
          ...prev,
          totalBlocked: Math.max(0, Number(prev.totalBlocked || 0) + blockedDelta),
        }
      })
    } catch (err) {
      setError(err.message || "Failed to update user status.")
    } finally {
      setUpdatingUserId("")
    }
  }

  return (
    <div className="space-y-4">
      <section className="app-surface soft-in rounded-xl p-5">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Admin</p>
        <h1 className="mt-2 text-2xl font-bold text-white">Admin Panel</h1>
        <p className="mt-1 text-sm text-slate-300">Manage users and account access controls.</p>
        <p className="mt-2 text-xs text-slate-500">Logged in as: {user?.email}</p>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="app-surface soft-in rounded-xl p-4">
          <p className="text-xs text-slate-400">Total Users</p>
          <p className="mt-2 text-2xl font-bold text-slate-100">{stats?.totalUsers ?? "-"}</p>
        </article>
        <article className="app-surface soft-in rounded-xl p-4">
          <p className="text-xs text-slate-400">Admins</p>
          <p className="mt-2 text-2xl font-bold text-amber-300">{stats?.totalAdmins ?? "-"}</p>
        </article>
        <article className="app-surface soft-in rounded-xl p-4">
          <p className="text-xs text-slate-400">Traders</p>
          <p className="mt-2 text-2xl font-bold text-sky-300">{stats?.totalTraders ?? "-"}</p>
        </article>
        <article className="app-surface soft-in rounded-xl p-4">
          <p className="text-xs text-slate-400">Blocked</p>
          <p className="mt-2 text-2xl font-bold text-rose-300">{stats?.totalBlocked ?? "-"}</p>
        </article>
      </section>

      <section className="app-surface soft-in rounded-xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300">Users</h2>
          <button
            type="button"
            onClick={loadData}
            className="rounded-md bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-100 hover:bg-slate-600"
          >
            Refresh
          </button>
        </div>
        {error ? <p className="mb-3 text-sm text-rose-400">{error}</p> : null}
        {isLoading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : nonAdminUsers.length === 0 ? (
          <p className="text-sm text-slate-400">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs sm:text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Email</th>
                  <th className="px-2 py-2">Phone</th>
                  <th className="px-2 py-2">Country</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {nonAdminUsers.map((item) => (
                  <tr key={item.id} className="border-t border-slate-700 text-slate-200">
                    <td className="px-2 py-2">{item.name}</td>
                    <td className="px-2 py-2">{item.email}</td>
                    <td className="px-2 py-2">{item.phone}</td>
                    <td className="px-2 py-2">{item.country}</td>
                    <td className="px-2 py-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          item.isBlocked ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/20 text-emerald-300"
                        }`}
                      >
                        {item.isBlocked ? "Blocked" : "Active"}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => handleToggleBlock(item)}
                        disabled={updatingUserId === item.id}
                        className={`rounded-md px-2 py-1 text-xs font-semibold text-white ${
                          item.isBlocked ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"
                        } disabled:opacity-60`}
                      >
                        {updatingUserId === item.id ? "Updating..." : item.isBlocked ? "Unblock" : "Block"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

