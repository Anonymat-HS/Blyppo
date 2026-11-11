import { useState } from "react"
import { useAuth } from "@/lib/supabase/auth"
import AuthCard, { AuthError, authButtonClass, authInputClass } from "@/components/ui/AuthCard"
import { useT } from "@/lib/i18n"

const MIN_LENGTH = 8

export default function ResetPassword() {
  const { updatePassword } = useAuth()
  const { t } = useT()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password.length < MIN_LENGTH) {
      setError(t("Password must be at least {n} characters", { n: MIN_LENGTH }))
      return
    }
    if (password !== confirm) {
      setError(t("The two passwords do not match"))
      return
    }

    setLoading(true)
    // On success the auth context leaves recovery mode and the app opens
    const { error } = await updatePassword(password)
    setLoading(false)
    if (error) setError(error)
  }

  return (
    <AuthCard title={t("Choose a new password")} subtitle={t("You will stay signed in afterwards")}>
      {error && <AuthError message={error} />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="new-password" className="block text-xs font-semibold mb-1.5 text-white/50">
            {t("New password")}
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
            placeholder={t("8+ characters")}
            className={authInputClass}
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-xs font-semibold mb-1.5 text-white/50">
            {t("Confirm password")}
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
          {loading ? t("Saving...") : t("Save new password")}
        </button>
      </form>
    </AuthCard>
  )
}
