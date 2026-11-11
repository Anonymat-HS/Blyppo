import { useState } from "react"
import { useAuth } from "@/lib/supabase/auth"
import { supabase } from "@/lib/supabase/client"

export default function CompleteProfile({
  onComplete,
}: {
  onComplete: () => void
}) {
  const { user } = useAuth()
  const [fullName, setFullName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!fullName.trim()) {
      setError("Please enter your name")
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({
      data: { full_name: fullName.trim() },
    })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    onComplete()
  }

  const defaultName = user?.email?.split("@")[0] ?? ""

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "#0F0F12" }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <img
            src="/android-chrome-192x192.png"
            alt="StudyForge"
            className="w-12 h-12 rounded-xl"
          />
          <span className="font-black text-xl tracking-tight text-white">
            StudyForge
          </span>
        </div>

        <div
          className="p-8 rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <h1 className="text-xl font-bold text-white mb-1">Complete your profile</h1>
          <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
            Just one more thing — what should we call you?
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
              <label htmlFor="profile-full-name" className="block text-xs font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                Full name
              </label>
              <input
                id="profile-full-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none transition-all duration-150 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] focus:border-[rgba(124,92,255,0.5)] focus:shadow-[0_0_0_3px_rgba(124,92,255,0.1)]"
                placeholder={defaultName}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 bg-[#7C5CFF] enabled:hover:bg-[#8B6BFF] enabled:hover:shadow-[0_0_20px_rgba(124,92,255,0.4)]"
            >
              {loading ? "Saving..." : "Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
