import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { useTrading } from "../context/TradingContext"
import { getCurrentSessionTokenId } from "../services/authService"

function getPasswordStrength(password) {
  const value = String(password || "")
  let score = 0
  if (value.length >= 8) score += 1
  if (/[A-Z]/.test(value)) score += 1
  if (/[a-z]/.test(value)) score += 1
  if (/\d/.test(value)) score += 1
  if (/[^A-Za-z0-9]/.test(value)) score += 1

  if (score <= 2) return { label: "Weak", color: "text-rose-400", bar: "bg-rose-500", width: "w-1/3" }
  if (score === 3 || score === 4) return { label: "Medium", color: "text-amber-300", bar: "bg-amber-400", width: "w-2/3" }
  return { label: "Strong", color: "text-emerald-400", bar: "bg-emerald-500", width: "w-full" }
}

export default function Settings() {
  const navigate = useNavigate()
  const { user, updateProfile, changePassword, logoutAllSessions, fetchMySessions, revokeMySession, logout } = useAuth()
  const { notificationPreferences, updateNotificationPreferences } = useTrading()
  const [name, setName] = useState("")
  const [country, setCountry] = useState("")
  const [proofOfAddress, setProofOfAddress] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [isPasswordSaving, setIsPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSessionActionLoading, setIsSessionActionLoading] = useState(false)
  const [sessionActionError, setSessionActionError] = useState("")
  const [sessionActionSuccess, setSessionActionSuccess] = useState("")
  const [activeSessions, setActiveSessions] = useState([])
  const [isSessionsLoading, setIsSessionsLoading] = useState(false)
  const [sessionsError, setSessionsError] = useState("")
  const [revokingSessionId, setRevokingSessionId] = useState("")
  const [notificationSuccess, setNotificationSuccess] = useState("")

  useEffect(() => {
    setName(user?.name || "")
    setCountry(user?.country || "")
    setProofOfAddress(user?.proofOfAddress || "")
  }, [user])

  const loadSessions = async () => {
    setIsSessionsLoading(true)
    setSessionsError("")
    try {
      const sessions = await fetchMySessions()
      setActiveSessions(sessions)
    } catch (err) {
      setSessionsError(err.message || "Failed to load sessions.")
    } finally {
      setIsSessionsLoading(false)
    }
  }

  useEffect(() => {
    loadSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError("")
    setSuccess("")

    if (!name.trim() || !country.trim()) {
      setError("Name and country are required.")
      return
    }

    setIsSaving(true)
    try {
      await updateProfile({
        name,
        country,
        proofOfAddress,
      })
      setSuccess("Profile updated successfully.")
    } catch (err) {
      setError(err.message || "Failed to update profile.")
    } finally {
      setIsSaving(false)
    }
  }

  const handlePasswordSubmit = async (event) => {
    event.preventDefault()
    setPasswordError("")
    setPasswordSuccess("")

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError("All password fields are required.")
      return
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.")
      return
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError("New password and confirm password do not match.")
      return
    }

    setIsPasswordSaving(true)
    try {
      await changePassword({ currentPassword, newPassword, confirmNewPassword })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmNewPassword("")
      setPasswordSuccess("Password updated. Redirecting to login...")
      setTimeout(() => {
        logout()
        navigate("/login", { replace: true })
      }, 1200)
    } catch (err) {
      setPasswordError(err.message || "Failed to update password.")
    } finally {
      setIsPasswordSaving(false)
    }
  }

  const passwordStrength = getPasswordStrength(newPassword)

  const handleLogoutAllSessions = async () => {
    setSessionActionError("")
    setSessionActionSuccess("")
    setIsSessionActionLoading(true)

    try {
      await logoutAllSessions()
      setSessionActionSuccess("Logged out from all devices. Redirecting to login...")
      setTimeout(() => {
        logout()
        navigate("/login", { replace: true })
      }, 1200)
    } catch (err) {
      setSessionActionError(err.message || "Failed to logout all sessions.")
    } finally {
      setIsSessionActionLoading(false)
    }
  }

  const handleRevokeSession = async (sessionId) => {
    setSessionsError("")
    setRevokingSessionId(sessionId)
    try {
      await revokeMySession(sessionId)
      await loadSessions()
      const currentSid = getCurrentSessionTokenId()
      const revoked = activeSessions.find((item) => item.id === sessionId)
      if (revoked && currentSid && revoked.sessionTokenId === currentSid) {
        logout()
        navigate("/login", { replace: true })
      }
    } catch (err) {
      setSessionsError(err.message || "Failed to revoke session.")
    } finally {
      setRevokingSessionId("")
    }
  }

  const handleNotificationPreferenceChange = (patch) => {
    updateNotificationPreferences(patch)
    setNotificationSuccess("Notification preferences updated.")
  }

  return (
    <div className="space-y-4">
      <section className="app-surface soft-in rounded-xl p-5">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Settings</p>
        <h1 className="mt-2 text-2xl font-bold text-white">Profile Settings</h1>
        <p className="mt-1 text-sm text-slate-300">Update your account profile details.</p>
      </section>

      <section className="app-surface soft-in rounded-xl p-5">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm text-slate-300">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label htmlFor="country" className="mb-1 block text-sm text-slate-300">
              Country
            </label>
            <input
              id="country"
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-slate-300">
              Email (Read-only)
            </label>
            <input
              id="email"
              type="email"
              value={user?.email || ""}
              readOnly
              className="w-full cursor-not-allowed rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-400"
            />
          </div>

          <div>
            <label htmlFor="phone" className="mb-1 block text-sm text-slate-300">
              Phone (Read-only)
            </label>
            <input
              id="phone"
              type="text"
              value={user?.phone || ""}
              readOnly
              className="w-full cursor-not-allowed rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-400"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="proofOfAddress" className="mb-1 block text-sm text-slate-300">
              Proof of Address (Optional)
            </label>
            <input
              id="proofOfAddress"
              type="text"
              value={proofOfAddress}
              onChange={(e) => setProofOfAddress(e.target.value)}
              placeholder="Document link/reference"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
            />
          </div>

          {error ? <p className="md:col-span-2 text-sm text-rose-400">{error}</p> : null}
          {success ? <p className="md:col-span-2 text-sm text-emerald-400">{success}</p> : null}

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </section>

      <section className="app-surface soft-in rounded-xl p-5">
        <h2 className="mb-3 text-lg font-semibold text-white">Change Password</h2>
        <form onSubmit={handlePasswordSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="currentPassword" className="mb-1 block text-sm text-slate-300">
              Current Password
            </label>
            <div className="flex gap-2">
              <input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword((prev) => !prev)}
                className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-200 hover:bg-slate-700"
              >
                {showCurrentPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <div />
          <div>
            <label htmlFor="newPassword" className="mb-1 block text-sm text-slate-300">
              New Password
            </label>
            <div className="flex gap-2">
              <input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-200 hover:bg-slate-700"
              >
                {showNewPassword ? "Hide" : "Show"}
              </button>
            </div>
            {newPassword ? (
              <div className="mt-2">
                <div className="h-1.5 w-full rounded bg-slate-700">
                  <div className={`h-1.5 rounded ${passwordStrength.bar} ${passwordStrength.width}`} />
                </div>
                <p className={`mt-1 text-xs ${passwordStrength.color}`}>Strength: {passwordStrength.label}</p>
              </div>
            ) : null}
          </div>
          <div>
            <label htmlFor="confirmNewPassword" className="mb-1 block text-sm text-slate-300">
              Confirm New Password
            </label>
            <div className="flex gap-2">
              <input
                id="confirmNewPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-200 hover:bg-slate-700"
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {passwordError ? <p className="md:col-span-2 text-sm text-rose-400">{passwordError}</p> : null}
          {passwordSuccess ? <p className="md:col-span-2 text-sm text-emerald-400">{passwordSuccess}</p> : null}

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isPasswordSaving}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPasswordSaving ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </section>

      <section className="app-surface soft-in rounded-xl p-5">
        <h2 className="mb-2 text-lg font-semibold text-white">Account Security</h2>
        <p className="mb-4 text-sm text-slate-300">
          End all active sessions across devices and require login again everywhere.
        </p>
        <button
          type="button"
          onClick={handleLogoutAllSessions}
          disabled={isSessionActionLoading}
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSessionActionLoading ? "Processing..." : "Logout All Devices"}
        </button>
        {sessionActionError ? <p className="mt-3 text-sm text-rose-400">{sessionActionError}</p> : null}
        {sessionActionSuccess ? <p className="mt-3 text-sm text-emerald-400">{sessionActionSuccess}</p> : null}
      </section>

      <section className="app-surface soft-in rounded-xl p-5">
        <h2 className="mb-2 text-lg font-semibold text-white">Notification Settings</h2>
        <p className="mb-4 text-sm text-slate-300">
          Control whether alert popups and notification sounds are shown while you trade.
        </p>

        <div className="space-y-3">
          <div className="theme-soft-block flex items-center justify-between rounded-lg px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-100">Alert Sound</p>
              <p className="text-xs text-slate-400">Play the notification sound when a price alert triggers.</p>
            </div>
            <button
              type="button"
              onClick={() =>
                handleNotificationPreferenceChange({
                  soundEnabled: !notificationPreferences.soundEnabled,
                })
              }
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                notificationPreferences.soundEnabled
                  ? "bg-emerald-600 text-white hover:bg-emerald-500"
                  : "bg-slate-700 text-slate-200 hover:bg-slate-600"
              }`}
            >
              {notificationPreferences.soundEnabled ? "Enabled" : "Disabled"}
            </button>
          </div>

          <div className="theme-soft-block flex items-center justify-between rounded-lg px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-100">Popup Alerts</p>
              <p className="text-xs text-slate-400">Show floating popup toasts when alerts are triggered.</p>
            </div>
            <button
              type="button"
              onClick={() =>
                handleNotificationPreferenceChange({
                  popupEnabled: !notificationPreferences.popupEnabled,
                })
              }
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                notificationPreferences.popupEnabled
                  ? "bg-emerald-600 text-white hover:bg-emerald-500"
                  : "bg-slate-700 text-slate-200 hover:bg-slate-600"
              }`}
            >
              {notificationPreferences.popupEnabled ? "Enabled" : "Disabled"}
            </button>
          </div>
        </div>

        {notificationSuccess ? <p className="mt-3 text-sm text-emerald-400">{notificationSuccess}</p> : null}
      </section>

      <section className="app-surface soft-in rounded-xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Active Sessions</h2>
          <button
            type="button"
            onClick={loadSessions}
            disabled={isSessionsLoading}
            className="rounded-md bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-100 hover:bg-slate-600 disabled:opacity-60"
          >
            {isSessionsLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        {sessionsError ? <p className="mb-3 text-sm text-rose-400">{sessionsError}</p> : null}
        {activeSessions.length === 0 ? (
          <p className="text-sm text-slate-400">No active sessions found.</p>
        ) : (
          <div className="space-y-2">
            {activeSessions.map((session) => {
              const isCurrent = session.sessionTokenId === getCurrentSessionTokenId()
              return (
                <div key={session.id} className="theme-soft-block rounded-lg p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-300">
                      {isCurrent ? "Current Session" : "Session"} | {session.ipAddress || "Unknown IP"}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleRevokeSession(session.id)}
                      disabled={Boolean(session.revokedAt) || revokingSessionId === session.id}
                      className="rounded-md bg-rose-600 px-2 py-1 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                    >
                      {session.revokedAt ? "Revoked" : revokingSessionId === session.id ? "Revoking..." : "Revoke"}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">{session.userAgent || "Unknown device"}</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Created: {session.createdAt ? new Date(session.createdAt).toLocaleString() : "-"} | Last Seen:{" "}
                    {session.lastSeenAt ? new Date(session.lastSeenAt).toLocaleString() : "-"}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
