import { useState } from "react"
import { CheckCircle } from "lucide-react"
import { useAuth } from "@/lib/supabase/auth"
import AuthCard, {
  AuthError,
  authButtonClass,
  authInputClass,
  authLinkClass,
} from "@/components/ui/AuthCard"
import { useT } from "@/lib/i18n"

export default function ForgotPassword({ onBackToLogin }: { onBackToLogin: () => void }) {
  const { requestPasswordReset } = useAuth()
  const { t } = useT()
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    const { error } = await requestPasswordReset(email.trim())
    setLoading(false)
    if (error) setError(error)
    else setSent(true)
  }

  const backLink = (
    <button onClick={onBackToLogin} className={authLinkClass}>
      {t("Back to sign in")}
    </button>
  )

  if (sent) {
    return (
      <AuthCard
        title={t("Check your email")}
        subtitle={t("If an account exists for this address, a reset link is on its way.")}
        footer={backLink}
      >
        <div className="flex items-start gap-3 text-sm text-white/60">
          <CheckCircle size={18} className="shrink-0 mt-0.5 text-green-400" />
          <p>
            {t("Open the link sent to")} <strong className="text-white">{email.trim()}</strong>{" "}
            {t("on this device to choose a new password.")}{" "}
            {t("Check your spam folder if you cannot find it.")}
          </p>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title={t("Reset your password")}
      subtitle={t("Enter your email and we will send you a reset link")}
      footer={backLink}
    >
      {error && <AuthError message={error} />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="reset-email" className="block text-xs font-semibold mb-1.5 text-white/50">
            {t("Email")}
          </label>
          <input
            id="reset-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            placeholder="you@example.com"
            className={authInputClass}
          />
        </div>

        <button type="submit" disabled={loading} className={authButtonClass}>
          {loading ? t("Sending...") : t("Send reset link")}
        </button>
      </form>
    </AuthCard>
  )
}
