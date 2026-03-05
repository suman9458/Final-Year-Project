import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.")
      return
    }

    setIsSubmitting(true)
    try {
      await login({ email, password })
      navigate("/trading", { replace: true })
    } catch (err) {
      setError(err.message || "Login failed.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="pointer-events-none absolute left-10 top-10 h-28 w-28 rounded-full bg-cyan-500/20 blur-2xl" />
      <div className="pointer-events-none absolute bottom-16 right-10 h-36 w-36 rounded-full bg-sky-500/20 blur-3xl" />
      <form onSubmit={handleSubmit} className="app-surface soft-in w-full max-w-md rounded-xl p-6">
        <h1 className="mb-1 text-2xl font-bold text-white">Welcome Back</h1>
        <p className="mb-6 text-sm text-slate-400">Login to your MiniTrade account</p>

        <div className="mb-4">
          <label className="mb-1 block text-sm text-slate-300" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-sky-500"
          />
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm text-slate-300" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-sky-500"
          />
        </div>

        {error ? <p className="mb-4 text-sm text-rose-400">{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-sky-600 p-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Logging in..." : "Login"}
        </button>

        <p className="mt-4 text-sm text-slate-400">
          New user?{" "}
          <Link to="/register" className="text-sky-400 hover:text-sky-300">
            Create an account
          </Link>
        </p>
      </form>
    </div>
  )
}
