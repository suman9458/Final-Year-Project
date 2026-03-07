/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from "react"
import {
  changePassword as changePasswordService,
  clearSession,
  fetchMySessions as fetchMySessionsService,
  getSession,
  loginUser,
  logoutAllSessions as logoutAllSessionsService,
  revokeMySession as revokeMySessionService,
  registerUser,
  updateProfile as updateProfileService,
} from "../services/authService"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const savedSession = getSession()
  const [user, setUser] = useState(savedSession?.user ?? null)
  const [token, setToken] = useState(savedSession?.token ?? null)

  const login = async (payload) => {
    const session = await loginUser(payload)
    setUser(session.user)
    setToken(session.token)
    return session
  }

  const register = async (payload) => {
    const session = await registerUser(payload)
    setUser(session.user)
    setToken(session.token)
    return session
  }

  const logout = () => {
    clearSession()
    setUser(null)
    setToken(null)
  }

  const updateProfile = async (payload) => {
    const updatedUser = await updateProfileService(payload)
    setUser(updatedUser)
    return updatedUser
  }

  const changePassword = async (payload) => changePasswordService(payload)
  const logoutAllSessions = async () => logoutAllSessionsService()
  const fetchMySessions = async () => fetchMySessionsService()
  const revokeMySession = async (sessionId) => revokeMySessionService(sessionId)

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      login,
      register,
      logout,
      updateProfile,
      changePassword,
      logoutAllSessions,
      fetchMySessions,
      revokeMySession,
    }),
    [token, user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider")
  }
  return context
}
