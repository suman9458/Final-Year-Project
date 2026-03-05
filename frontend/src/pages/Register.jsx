import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { sendPhoneOtp, verifyPhoneOtp } from "../services/authService"

const countryOptions = ["India", "United States", "United Kingdom", "UAE", "Singapore", "Other"]

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [country, setCountry] = useState("India")
  const [proofOfAddress, setProofOfAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [phoneVerificationToken, setPhoneVerificationToken] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [otpMessage, setOtpMessage] = useState("")
  const [otpDemoCode, setOtpDemoCode] = useState("")
  const [error, setError] = useState("")
  const [isOtpSending, setIsOtpSending] = useState(false)
  const [isOtpVerifying, setIsOtpVerifying] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isPhoneVerified = Boolean(phoneVerificationToken)

  const handlePhoneChange = (value) => {
    setPhone(value)
    setOtp("")
    setOtpMessage("")
    setOtpDemoCode("")
    setPhoneVerificationToken("")
  }

  const handleSendOtp = async () => {
    setError("")
    setOtpMessage("")
    setOtpDemoCode("")

    if (!phone.trim()) {
      setError("Phone number is required to send OTP.")
      return
    }

    setIsOtpSending(true)
    try {
      const response = await sendPhoneOtp(phone)
      setOtpMessage(response.message || "OTP sent.")
      setOtpDemoCode(response.demoOtp || "")
    } catch (err) {
      setError(err.message || "Failed to send OTP.")
    } finally {
      setIsOtpSending(false)
    }
  }

  const handleVerifyOtp = async () => {
    setError("")
    setOtpMessage("")

    if (!phone.trim() || !otp.trim()) {
      setError("Phone and OTP are required.")
      return
    }

    setIsOtpVerifying(true)
    try {
      const response = await verifyPhoneOtp({ phone, otp })
      setPhoneVerificationToken(response.verificationToken)
      setOtpMessage(response.message || "Phone verified.")
      setOtpDemoCode("")
    } catch (err) {
      setError(err.message || "Failed to verify OTP.")
    } finally {
      setIsOtpVerifying(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim() || !country.trim()) {
      setError("Name, email, country and password are required.")
      return
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }
    if (!isPhoneVerified) {
      setError("Verify your phone number with OTP before creating account.")
      return
    }

    setIsSubmitting(true)
    try {
      await register({
        name,
        email,
        password,
        country,
        proofOfAddress,
        phone,
        phoneVerificationToken,
      })
      navigate("/trading", { replace: true })
    } catch (err) {
      setError(err.message || "Registration failed.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-8">
      <div className="pointer-events-none absolute left-10 top-10 h-28 w-28 rounded-full bg-cyan-500/20 blur-2xl" />
      <div className="pointer-events-none absolute bottom-16 right-10 h-36 w-36 rounded-full bg-sky-500/20 blur-3xl" />
      <form onSubmit={handleSubmit} className="app-surface soft-in w-full max-w-lg rounded-xl p-6">
        <h1 className="mb-1 text-2xl font-bold text-white">Create Account</h1>
        <p className="mb-6 text-sm text-slate-400">Complete profile details and verify phone with OTP</p>

        <div className="mb-4">
          <label className="mb-1 block text-sm text-slate-300" htmlFor="name">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-sky-500"
          />
        </div>

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
          <label className="mb-1 block text-sm text-slate-300" htmlFor="country">
            Country
          </label>
          <select
            id="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-sky-500"
          >
            {countryOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm text-slate-300" htmlFor="proofAddress">
            Proof of Address (Optional URL / Note)
          </label>
          <input
            id="proofAddress"
            type="text"
            value={proofOfAddress}
            onChange={(e) => setProofOfAddress(e.target.value)}
            placeholder="e.g. Aadhaar utility bill link/reference"
            className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-sky-500"
          />
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-sm text-slate-300" htmlFor="phone">
            Phone Number
          </label>
          <div className="flex gap-2">
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="+91XXXXXXXXXX"
              className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-sky-500"
            />
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={isOtpSending}
              className="rounded bg-cyan-600 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isOtpSending ? "Sending..." : "Send OTP"}
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm text-slate-300" htmlFor="otp">
            OTP
          </label>
          <div className="flex gap-2">
            <input
              id="otp"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="6-digit OTP"
              className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-sky-500"
            />
            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={isOtpVerifying || isPhoneVerified}
              className="rounded bg-emerald-600 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPhoneVerified ? "Verified" : isOtpVerifying ? "Verifying..." : "Verify OTP"}
            </button>
          </div>
          {otpMessage ? <p className="mt-1 text-xs text-emerald-400">{otpMessage}</p> : null}
          {otpDemoCode ? <p className="mt-1 text-xs text-amber-300">Demo OTP: {otpDemoCode}</p> : null}
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
            placeholder="At least 6 characters"
            className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-sky-500"
          />
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm text-slate-300" htmlFor="confirmPassword">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat password"
            className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-sky-500"
          />
        </div>

        {error ? <p className="mb-4 text-sm text-rose-400">{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-sky-600 p-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Creating..." : "Create Account"}
        </button>

        <p className="mt-4 text-sm text-slate-400">
          Already have an account?{" "}
          <Link to="/login" className="text-sky-400 hover:text-sky-300">
            Login
          </Link>
        </p>
      </form>
    </div>
  )
}
