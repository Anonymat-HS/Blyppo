import { useState } from "react"
import { useAuth } from "@/lib/supabase/auth"
import AuthCard, { AuthError, authButtonClass, authInputClass } from "@/components/ui/AuthCard"

const MIN_LENGTH = 8

export default function ResetPassword() {
  const { updatePassword } = useAuth()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters`)
      return
    }
    if (password !== confirm) {
      setError("The two passwords do not match")
      return
    }

    setLoading(true)
    // On success the auth context leaves recovery mode and the app opens
    const { error } = await updatePassword(password)
    setLoading(false)
    if (error) setError(error)
  }

  return (
    <AuthCard title="Choose a new password" subtitle="You will stay signed in afterwards">
      {error && <AuthError message={error} />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="new-password" className="block text-xs font-semibold mb-1.5 text-white/50">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={MIN_LENGTH}
            autoFocus
            autoComplete="new-password"
            placeholder="8+ characters"
            className={authInputClass}
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-xs font-semibold mb-1.5 text-white/50">
            Confirm password
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            className={authInputClass}
          />
        </div>

        <button type="submit" disabled={loading} className={authButtonClass}>
          {loading ? "Saving..." : "Save new password"}
        </button>
      </form>
    </AuthCard>
  )
}
