import { useState, useRef } from "react"
import { Camera, Flame, Brain, Target, TrendingUp, BookOpen, Upload, ArrowLeft, Pencil } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/lib/supabase/auth"
import { useUserStats } from "@/hooks/useUserStats"
import ErrorState from "@/components/ui/ErrorState"
import DeleteAccount from "@/components/ui/DeleteAccount"

const MAX_AVATAR_MB = 2

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return (name[0] ?? "?").toUpperCase()
}

function getAvatarColor(name: string): string {
  const colors = [
    "linear-gradient(135deg, #7C5CFF, #6D4FEA)",
    "linear-gradient(135deg, #8B5CF6, #7C3AED)",
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export default function Profile({ onBack }: { onBack: () => void }) {
  const { user, updateFullName } = useAuth()
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState("")
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  const {
    loading,
    error,
    reload,
    courses,
    answeredCount,
    quizzesTaken,
    flashcardsReviewed,
    streak,
    avgScore,
    breakdown,
  } = useUserStats(user?.id)

  const courseCount = courses.length
  const flashcardCount = flashcardsReviewed
  const courseStats = breakdown

  const name = user?.user_metadata?.full_name ?? user?.email ?? ""
  const email = user?.email ?? ""
  const createdAt = user?.created_at ?? ""
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined
  const initials = getInitials(name)
  const bgGradient = getAvatarColor(name)

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    const next = nameDraft.trim()
    if (!next) {
      setNameError("Please enter your name")
      return
    }
    setSavingName(true)
    setNameError(null)
    const { error } = await updateFullName(next)
    setSavingName(false)
    if (error) setNameError(error)
    else setEditingName(false)
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !user) return
    setAvatarError(null)

    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) {
      setAvatarError("Please choose a PNG, JPEG, WebP or GIF image.")
      return
    }
    if (file.size > MAX_AVATAR_MB * 1024 * 1024) {
      setAvatarError(`Image exceeds the ${MAX_AVATAR_MB} MB limit.`)
      return
    }

    setUploading(true)
    try {
      const ext = file.name.includes(".") ? file.name.split(".").pop() : "png"
      const filePath = `${user.id}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(filePath)

      // The auth listener picks up the updated user: no page reload needed
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrlData.publicUrl },
      })
      if (updateError) throw updateError
    } catch (err) {
      setAvatarError(`Could not update your photo: ${(err as Error).message}`)
    } finally {
      setUploading(false)
    }
  }

  const createdDate = createdAt
    ? new Date(createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : ""

  if (error) {
    return <ErrorState message={error} onRetry={reload} />
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto flex items-center justify-center" style={{ minHeight: "60vh" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: "#7C5CFF", borderTopColor: "transparent" }} />
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.38)" }}>Loading profile…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-xl transition-colors"
          style={{ color: "rgba(255,255,255,0.4)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.9)" }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.4)" }}
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-2xl font-black text-white">Profile</h1>
      </div>

      {/* Profile card */}
      <div
        className="p-6 rounded-2xl mb-6 flex items-center gap-5"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div className="relative shrink-0">
          <div
            className="w-16 h-16 rounded-full overflow-hidden cursor-pointer ring-2 ring-violet-500/20 hover:ring-violet-500/40 transition-all"
            style={{ background: avatarUrl ? "none" : bgGradient }}
            onClick={() => fileInputRef.current?.click()}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <span className="flex items-center justify-center w-full h-full text-lg font-bold text-white">
                {initials}
              </span>
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-bg transition-colors"
            style={{
              background: "#7C5CFF",
              borderColor: "#0F0F12",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#8B6BFF" }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#7C5CFF" }}
          >
            {uploading ? (
              <div className="w-3 h-3 border border-t-transparent rounded-full animate-spin" style={{ borderColor: "white", borderTopColor: "transparent" }} />
            ) : (
              <Camera size={11} className="text-white" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={handleAvatarUpload}
          />
        </div>
        <div className="min-w-0">
          {editingName ? (
            <form onSubmit={handleSaveName} className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                aria-label="Full name"
                maxLength={80}
                autoFocus
                className="px-3 py-1.5 rounded-lg text-sm text-white outline-none bg-white/5 border border-white/10 focus:border-[#7C5CFF]/50"
              />
              <button
                type="submit"
                disabled={savingName}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#7C5CFF] hover:bg-[#8B6BFF] disabled:opacity-50 transition-colors"
              >
                {savingName ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setEditingName(false)}
                disabled={savingName}
                className="px-3 py-1.5 rounded-lg text-xs text-white/60 border border-white/10 hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-lg font-bold text-white truncate">{name}</h2>
              <button
                onClick={() => {
                  setNameDraft(user?.user_metadata?.full_name ?? "")
                  setNameError(null)
                  setEditingName(true)
                }}
                aria-label="Edit name"
                title="Edit name"
                className="shrink-0 p-1 rounded-md text-white/30 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Pencil size={13} />
              </button>
            </div>
          )}
          {nameError && <p className="text-xs mt-1 text-[#FCA5A5]">{nameError}</p>}
          <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{email}</p>
          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
            Member since {createdDate}
          </p>
          {avatarError && (
            <p className="text-xs mt-2" style={{ color: "#FCA5A5" }}>
              {avatarError}
            </p>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Courses", value: String(courseCount), icon: BookOpen, color: "#7C5CFF" },
          { label: "Quizzes taken", value: String(quizzesTaken), icon: Brain, color: "#A78BFA" },
          { label: "Flashcards reviewed", value: String(flashcardCount), icon: TrendingUp, color: "#00D9FF" },
          { label: "Day streak", value: String(streak), icon: Flame, color: "#FCD34D" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="p-4 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <Icon size={13} style={{ color }} />
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>
                {label}
              </p>
            </div>
            <p className="text-2xl font-black" style={{ color }}>{value}</p>
            {label === "Avg score" && (
              <p className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
                Across all courses
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Avg score card */}
      <div
        className="p-6 rounded-2xl mb-6"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div className="flex items-center gap-1.5 mb-0.5">
          <Target size={14} style={{ color: "#4ADE80" }} />
          <h2 className="font-bold text-white">Average Score</h2>
        </div>
        <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.38)" }}>
          Latest answer to each question
        </p>
        <div className="flex items-end gap-3">
          <span className="text-4xl font-black" style={{ color: "#4ADE80" }}>
            {avgScore}%
          </span>
          <span className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>
            {answeredCount > 0 ? `based on ${answeredCount} question${answeredCount !== 1 ? "s" : ""}` : "No data yet"}
          </span>
        </div>
        <div
          className="h-2 rounded-full overflow-hidden mt-3"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${avgScore}%`,
              background: "linear-gradient(90deg, #22C55E88, #22C55E)",
            }}
          />
        </div>
      </div>

      {/* Per-course progress */}
      <div
        className="p-6 rounded-2xl"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <h2 className="font-bold text-white mb-4">Course Progress</h2>
        {courseStats.length === 0 ? (
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
            <Upload size={14} className="inline mr-1" />
            Upload your first course to get started.
          </p>
        ) : (
          <div className="space-y-4">
            {courseStats.map((c) => (
              <div key={c.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-white truncate max-w-[70%]" title={c.title}>
                    {c.title}
                  </span>
                  <span className="text-sm font-bold shrink-0 ml-2" style={{ color: c.color }}>
                    {c.progress}%
                  </span>
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.07)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${c.progress}%`,
                      background: `linear-gradient(90deg, ${c.color}88, ${c.color})`,
                    }}
                  />
                </div>
                <p className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
                  {c.correctCount}/{c.quizCount} correct
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <DeleteAccount />
    </div>
  )
}