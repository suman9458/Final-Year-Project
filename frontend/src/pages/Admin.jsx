import { useEffect, useMemo, useState } from "react"
import {
  fetchAdminStats,
  fetchAdminUsers,
  fetchAdminWalletRequests,
  updateAdminWalletRequestStatus,
  updateUserBlockedStatus,
  updateUserKycStatus,
} from "../services/adminService"
import { useAuth } from "../context/AuthContext"

export default function Admin() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [updatingUserId, setUpdatingUserId] = useState("")
  const [updatingKycUserId, setUpdatingKycUserId] = useState("")
  const [walletRequests, setWalletRequests] = useState([])
  const [updatingWalletRequestId, setUpdatingWalletRequestId] = useState("")
  const [userSearch, setUserSearch] = useState("")
  const [userKycFilter, setUserKycFilter] = useState("all")
  const [userStatusFilter, setUserStatusFilter] = useState("all")
  const [walletSearch, setWalletSearch] = useState("")
  const [walletTypeFilter, setWalletTypeFilter] = useState("all")
  const [walletStatusFilter, setWalletStatusFilter] = useState("all")
  const [userSortKey, setUserSortKey] = useState("createdAt")
  const [userSortDir, setUserSortDir] = useState("desc")
  const [walletSortKey, setWalletSortKey] = useState("createdAt")
  const [walletSortDir, setWalletSortDir] = useState("desc")
  const [userPage, setUserPage] = useState(1)
  const [walletPage, setWalletPage] = useState(1)

  const USERS_PAGE_SIZE = 10
  const WALLET_PAGE_SIZE = 10

  const nonAdminUsers = useMemo(() => users.filter((item) => item.role !== "admin"), [users])
  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase()
    return nonAdminUsers.filter((item) => {
      if (userKycFilter !== "all" && String(item.kycStatus || "pending") !== userKycFilter) return false
      if (userStatusFilter === "active" && item.isBlocked) return false
      if (userStatusFilter === "blocked" && !item.isBlocked) return false
      if (!query) return true
      return [item.name, item.email, item.phone, item.country].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query)
      )
    })
  }, [nonAdminUsers, userKycFilter, userSearch, userStatusFilter])

  const sortedUsers = useMemo(() => {
    const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true })
    const rank = { approved: 3, pending: 2, rejected: 1 }
    const sign = userSortDir === "asc" ? 1 : -1
    const items = [...filteredUsers]
    items.sort((a, b) => {
      let result = 0
      if (userSortKey === "name") {
        result = collator.compare(String(a.name || ""), String(b.name || ""))
      } else if (userSortKey === "email") {
        result = collator.compare(String(a.email || ""), String(b.email || ""))
      } else if (userSortKey === "country") {
        result = collator.compare(String(a.country || ""), String(b.country || ""))
      } else if (userSortKey === "kycStatus") {
        result = (rank[a.kycStatus] || 0) - (rank[b.kycStatus] || 0)
      } else if (userSortKey === "status") {
        result = Number(Boolean(a.isBlocked)) - Number(Boolean(b.isBlocked))
      } else {
        result = collator.compare(String(a.createdAt || ""), String(b.createdAt || ""))
      }
      return result * sign
    })
    return items
  }, [filteredUsers, userSortDir, userSortKey])

  const userTotalPages = Math.max(1, Math.ceil(sortedUsers.length / USERS_PAGE_SIZE))
  const pagedUsers = useMemo(() => {
    const page = Math.min(userPage, userTotalPages)
    const start = (page - 1) * USERS_PAGE_SIZE
    return sortedUsers.slice(start, start + USERS_PAGE_SIZE)
  }, [sortedUsers, userPage, userTotalPages])

  const filteredWalletRequests = useMemo(() => {
    const query = walletSearch.trim().toLowerCase()
    return walletRequests.filter((item) => {
      if (walletTypeFilter !== "all" && String(item.requestType || "").toLowerCase() !== walletTypeFilter) return false
      if (walletStatusFilter !== "all" && String(item.status || "").toLowerCase() !== walletStatusFilter) return false
      if (!query) return true
      return [item.requesterEmail, item.userId, item.note, item.reviewNote].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query)
      )
    })
  }, [walletRequests, walletSearch, walletTypeFilter, walletStatusFilter])

  const sortedWalletRequests = useMemo(() => {
    const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true })
    const statusRank = { approved: 3, pending: 2, rejected: 1 }
    const sign = walletSortDir === "asc" ? 1 : -1
    const items = [...filteredWalletRequests]
    items.sort((a, b) => {
      let result = 0
      if (walletSortKey === "user") {
        result = collator.compare(String(a.requesterEmail || a.userId || ""), String(b.requesterEmail || b.userId || ""))
      } else if (walletSortKey === "type") {
        result = collator.compare(String(a.requestType || ""), String(b.requestType || ""))
      } else if (walletSortKey === "amount") {
        result = Number(a.amount || 0) - Number(b.amount || 0)
      } else if (walletSortKey === "status") {
        result = (statusRank[a.status] || 0) - (statusRank[b.status] || 0)
      } else {
        result = collator.compare(String(a.createdAt || ""), String(b.createdAt || ""))
      }
      return result * sign
    })
    return items
  }, [filteredWalletRequests, walletSortDir, walletSortKey])

  const walletTotalPages = Math.max(1, Math.ceil(sortedWalletRequests.length / WALLET_PAGE_SIZE))
  const pagedWalletRequests = useMemo(() => {
    const page = Math.min(walletPage, walletTotalPages)
    const start = (page - 1) * WALLET_PAGE_SIZE
    return sortedWalletRequests.slice(start, start + WALLET_PAGE_SIZE)
  }, [sortedWalletRequests, walletPage, walletTotalPages])

  const toggleUserSort = (key) => {
    if (userSortKey === key) {
      setUserSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
      return
    }
    setUserSortKey(key)
    setUserSortDir("asc")
  }

  const toggleWalletSort = (key) => {
    if (walletSortKey === key) {
      setWalletSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
      return
    }
    setWalletSortKey(key)
    setWalletSortDir("asc")
  }

  useEffect(() => {
    setUserPage(1)
  }, [userSearch, userKycFilter, userStatusFilter])

  useEffect(() => {
    if (userPage > userTotalPages) {
      setUserPage(userTotalPages)
    }
  }, [userPage, userTotalPages])

  useEffect(() => {
    setWalletPage(1)
  }, [walletSearch, walletTypeFilter, walletStatusFilter])

  useEffect(() => {
    if (walletPage > walletTotalPages) {
      setWalletPage(walletTotalPages)
    }
  }, [walletPage, walletTotalPages])

  const loadData = async () => {
    setIsLoading(true)
    setError("")
    try {
      const [statsData, usersData, walletRequestsData] = await Promise.all([
        fetchAdminStats(),
        fetchAdminUsers(),
        fetchAdminWalletRequests(),
      ])
      setStats(statsData)
      setUsers(usersData)
      setWalletRequests(walletRequestsData)
    } catch (err) {
      setError(err.message || "Failed to load admin data.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleWalletRequestStatus = async (item, status) => {
    if (!item?.id || item.status === status) return
    setError("")
    setUpdatingWalletRequestId(item.id)
    try {
      const updated = await updateAdminWalletRequestStatus(item.id, { status })
      setWalletRequests((prev) => prev.map((request) => (request.id === updated.id ? updated : request)))
    } catch (err) {
      setError(err.message || "Failed to update wallet request.")
    } finally {
      setUpdatingWalletRequestId("")
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

  const handleKycStatusChange = async (targetUser, kycStatus) => {
    if (targetUser.kycStatus === kycStatus) return
    setError("")
    setUpdatingKycUserId(targetUser.id)
    try {
      const updated = await updateUserKycStatus(targetUser.id, kycStatus)
      setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
    } catch (err) {
      setError(err.message || "Failed to update KYC status.")
    } finally {
      setUpdatingKycUserId("")
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
          <h2 className="text-sm font-semibold text-slate-300">Users ({filteredUsers.length})</h2>
          <button
            type="button"
            onClick={loadData}
            className="rounded-md bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-100 hover:bg-slate-600"
          >
            Refresh
          </button>
        </div>
        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
          <input
            type="text"
            value={userSearch}
            onChange={(event) => setUserSearch(event.target.value)}
            placeholder="Search name/email/phone"
            className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-500"
          />
          <select
            value={userKycFilter}
            onChange={(event) => setUserKycFilter(event.target.value)}
            className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-500"
          >
            <option value="all">All KYC</option>
            <option value="pending">KYC Pending</option>
            <option value="approved">KYC Approved</option>
            <option value="rejected">KYC Rejected</option>
          </select>
          <select
            value={userStatusFilter}
            onChange={(event) => setUserStatusFilter(event.target.value)}
            className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setUserSearch("")
              setUserKycFilter("all")
              setUserStatusFilter("all")
            }}
            className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700"
          >
            Clear Filters
          </button>
        </div>
        {error ? <p className="mb-3 text-sm text-rose-400">{error}</p> : null}
        {isLoading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : filteredUsers.length === 0 ? (
          <p className="text-sm text-slate-400">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs sm:text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="px-2 py-2">
                    <button type="button" onClick={() => toggleUserSort("name")} className="hover:text-slate-200">
                      Name {userSortKey === "name" ? (userSortDir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th className="px-2 py-2">
                    <button type="button" onClick={() => toggleUserSort("email")} className="hover:text-slate-200">
                      Email {userSortKey === "email" ? (userSortDir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th className="px-2 py-2">Phone</th>
                  <th className="px-2 py-2">
                    <button type="button" onClick={() => toggleUserSort("country")} className="hover:text-slate-200">
                      Country {userSortKey === "country" ? (userSortDir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th className="px-2 py-2">
                    <button type="button" onClick={() => toggleUserSort("kycStatus")} className="hover:text-slate-200">
                      KYC {userSortKey === "kycStatus" ? (userSortDir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th className="px-2 py-2">
                    <button type="button" onClick={() => toggleUserSort("status")} className="hover:text-slate-200">
                      Status {userSortKey === "status" ? (userSortDir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th className="px-2 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedUsers.map((item) => (
                  <tr key={item.id} className="border-t border-slate-700 text-slate-200">
                    <td className="px-2 py-2">{item.name}</td>
                    <td className="px-2 py-2">{item.email}</td>
                    <td className="px-2 py-2">{item.phone}</td>
                    <td className="px-2 py-2">{item.country}</td>
                    <td className="px-2 py-2">
                      <select
                        value={item.kycStatus || "pending"}
                        disabled={updatingKycUserId === item.id}
                        onChange={(event) => handleKycStatusChange(item, event.target.value)}
                        className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-200 disabled:opacity-60"
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </td>
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
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
              <span>
                Page {Math.min(userPage, userTotalPages)} / {userTotalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setUserPage((prev) => Math.max(1, prev - 1))}
                  disabled={userPage <= 1}
                  className="rounded-md border border-slate-600 px-2 py-1 disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => setUserPage((prev) => Math.min(userTotalPages, prev + 1))}
                  disabled={userPage >= userTotalPages}
                  className="rounded-md border border-slate-600 px-2 py-1 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="app-surface soft-in rounded-xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300">Wallet Requests ({filteredWalletRequests.length})</h2>
        </div>
        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
          <input
            type="text"
            value={walletSearch}
            onChange={(event) => setWalletSearch(event.target.value)}
            placeholder="Search user/email/note"
            className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-500"
          />
          <select
            value={walletTypeFilter}
            onChange={(event) => setWalletTypeFilter(event.target.value)}
            className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-500"
          >
            <option value="all">All Types</option>
            <option value="deposit">Deposit</option>
            <option value="withdraw">Withdraw</option>
          </select>
          <select
            value={walletStatusFilter}
            onChange={(event) => setWalletStatusFilter(event.target.value)}
            className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setWalletSearch("")
              setWalletTypeFilter("all")
              setWalletStatusFilter("all")
            }}
            className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700"
          >
            Clear Filters
          </button>
        </div>
        {isLoading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : filteredWalletRequests.length === 0 ? (
          <p className="text-sm text-slate-400">No wallet requests found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs sm:text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="px-2 py-2">
                    <button type="button" onClick={() => toggleWalletSort("user")} className="hover:text-slate-200">
                      User {walletSortKey === "user" ? (walletSortDir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th className="px-2 py-2">
                    <button type="button" onClick={() => toggleWalletSort("type")} className="hover:text-slate-200">
                      Type {walletSortKey === "type" ? (walletSortDir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th className="px-2 py-2">
                    <button type="button" onClick={() => toggleWalletSort("amount")} className="hover:text-slate-200">
                      Amount {walletSortKey === "amount" ? (walletSortDir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th className="px-2 py-2">
                    <button type="button" onClick={() => toggleWalletSort("status")} className="hover:text-slate-200">
                      Status {walletSortKey === "status" ? (walletSortDir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th className="px-2 py-2">Note</th>
                  <th className="px-2 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedWalletRequests.map((item) => (
                  <tr key={item.id} className="border-t border-slate-700 text-slate-200">
                    <td className="px-2 py-2">{item.requesterEmail || item.userId}</td>
                    <td className="px-2 py-2 capitalize">{item.requestType}</td>
                    <td className="px-2 py-2">${Number(item.amount || 0).toFixed(2)}</td>
                    <td className="px-2 py-2 capitalize">{item.status}</td>
                    <td className="px-2 py-2">{item.note || "-"}</td>
                    <td className="px-2 py-2">
                      {item.status === "pending" ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={updatingWalletRequestId === item.id}
                            onClick={() => handleWalletRequestStatus(item, "approved")}
                            className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={updatingWalletRequestId === item.id}
                            onClick={() => handleWalletRequestStatus(item, "rejected")}
                            className="rounded-md bg-rose-600 px-2 py-1 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-60"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Reviewed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
              <span>
                Page {Math.min(walletPage, walletTotalPages)} / {walletTotalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setWalletPage((prev) => Math.max(1, prev - 1))}
                  disabled={walletPage <= 1}
                  className="rounded-md border border-slate-600 px-2 py-1 disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => setWalletPage((prev) => Math.min(walletTotalPages, prev + 1))}
                  disabled={walletPage >= walletTotalPages}
                  className="rounded-md border border-slate-600 px-2 py-1 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
