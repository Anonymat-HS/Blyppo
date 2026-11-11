import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { useAuth } from "@/lib/supabase/auth"
import { Logo } from "@/components/ui/Logo"

export default function Login({
  onSwitchToSignup,
  onForgotPassword,
}: {
  onSwitchToSignup: () => void
  onForgotPassword: () => void
}) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) setError(error)
    setLoading(false)
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
          <h1 className="text-xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.38)" }}>
            Sign in to continue learning
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
              <label htmlFor="login-email" className="block text-xs font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none transition-all duration-150 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] focus:border-[rgba(124,92,255,0.5)] focus:shadow-[0_0_0_3px_rgba(124,92,255,0.1)]"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="block text-xs font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-xs font-medium text-[#A78BFA] hover:text-[#C4B5FD] transition-colors duration-150"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 pr-10 rounded-xl text-sm text-white outline-none transition-all duration-150 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] focus:border-[rgba(124,92,255,0.5)] focus:shadow-[0_0_0_3px_rgba(124,92,255,0.1)]"
                  placeholder="••••••••"
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
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 bg-[#7C5CFF] enabled:hover:bg-[#8B6BFF] enabled:hover:shadow-[0_0_20px_rgba(124,92,255,0.4)]"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-5" style={{ color: "rgba(255,255,255,0.35)" }}>
          Don't have an account?{" "}
          <button
            onClick={onSwitchToSignup}
            className="font-semibold transition-colors duration-150 text-[#A78BFA] hover:text-[#C4B5FD]"
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  )
}
