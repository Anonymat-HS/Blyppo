import { useState } from "react"
import { Eye, EyeOff, CheckCircle } from "lucide-react"
import { useAuth } from "@/lib/supabase/auth"
import { Logo } from "@/components/ui/Logo"

function getPasswordStrength(pw: string): { label: string; color: string; width: string } {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++

  if (score <= 1) return { label: "Weak", color: "#F87171", width: "20%" }
  if (score <= 2) return { label: "Fair", color: "#F59E0B", width: "40%" }
  if (score <= 3) return { label: "Good", color: "#00D9FF", width: "70%" }
  return { label: "Strong", color: "#22C55E", width: "100%" }
}

export default function Signup({
  onSwitchToLogin,
}: {
  onSwitchToLogin: () => void
}) {
  const { signUp } = useAuth()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  const strength = getPasswordStrength(password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setMessage("")

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setLoading(true)
    const result = await signUp(email, password, fullName.trim())
    if (result.error) setError(result.error)
    if (result.message) setMessage(result.message)
    setLoading(false)
  }

  if (message) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: "#0F0F12" }}
      >
        <div className="w-full max-w-md text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{
              background: "rgba(34,197,94,0.12)",
              border: "1px solid rgba(34,197,94,0.25)",
            }}
          >
            <CheckCircle size={28} className="text-green-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Check your email</h1>
          <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.45)" }}>
            We sent a confirmation link to <strong className="text-white">{email}</strong>.
            Click it to activate your account.
          </p>
          <button
            onClick={onSwitchToLogin}
            className="text-sm font-semibold transition-colors duration-150 text-[#A78BFA] hover:text-[#C4B5FD]"
          >
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "#0F0F12" }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <Logo size="lg" />
        </div>

        <div
          className="p-8 rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <h1 className="text-xl font-bold text-white mb-1">Create your account</h1>
          <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.38)" }}>
            Start learning smarter in seconds
          </p>

          {error && (
            <div
              className="mb-4 px-4 py-3 rounded-xl text-sm"
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.25)",
                color: "#FCA5A5",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="signup-full-name" className="block text-xs font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                Full name
              </label>
              <input
                id="signup-full-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none transition-all duration-150 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] focus:border-[rgba(124,92,255,0.5)] focus:shadow-[0_0_0_3px_rgba(124,92,255,0.1)]"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="signup-email" className="block text-xs font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none transition-all duration-150 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] focus:border-[rgba(124,92,255,0.5)] focus:shadow-[0_0_0_3px_rgba(124,92,255,0.1)]"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="signup-password" className="block text-xs font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                Password
              </label>
              <div className="relative">
                <input
                id="signup-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-2.5 pr-10 rounded-xl text-sm text-white outline-none transition-all duration-150 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] focus:border-[rgba(124,92,255,0.5)] focus:shadow-[0_0_0_3px_rgba(124,92,255,0.1)]"
                  placeholder="8+ characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors text-[rgba(255,255,255,0.3)] hover:text-[rgba(255,255,255,0.7)]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex-1 h-1 rounded-full overflow-hidden mr-3" style={{ background: "rgba(255,255,255,0.07)" }}>
                      <div className="h-full rounded-full transition-all duration-300" style={{ width: strength.width, background: strength.color }} />
                    </div>
                    <span className="text-[11px] font-medium" style={{ color: strength.color }}>{strength.label}</span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 bg-[#7C5CFF] enabled:hover:bg-[#8B6BFF] enabled:hover:shadow-[0_0_20px_rgba(124,92,255,0.4)]"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-5" style={{ color: "rgba(255,255,255,0.35)" }}>
          Already have an account?{" "}
          <button
            onClick={onSwitchToLogin}
            className="font-semibold transition-colors duration-150 text-[#A78BFA] hover:text-[#C4B5FD]"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  )
}
