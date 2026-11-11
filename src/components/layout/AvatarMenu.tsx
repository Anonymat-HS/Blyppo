import { useState, useRef, useEffect } from "react"
import { User, LogOut, MessageSquareHeart } from "lucide-react"
import { useAuth } from "@/lib/supabase/auth"
import type { Screen } from "@/App"
import FeedbackDialog from "@/components/ui/FeedbackDialog"

interface AvatarMenuProps {
  onNavigate: (screen: Screen) => void
}

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
    "linear-gradient(135deg, #A78BFA, #7C5CFF)",
    "linear-gradient(135deg, #6D28D9, #5B21B6)",
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export default function AvatarMenu({ onNavigate }: AvatarMenuProps) {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  const name = user?.user_metadata?.full_name ?? user?.email ?? ""
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined
  const initials = getInitials(name)
  const bgGradient = getAvatarColor(name)

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-9 h-9 rounded-full overflow-hidden shrink-0 ring-2 ring-transparent hover:ring-violet-500/40 transition-all duration-200"
        style={{ background: avatarUrl ? "none" : bgGradient }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="flex items-center justify-center w-full h-full text-xs font-bold text-white">
            {initials}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-2 w-48 rounded-xl py-1.5 z-50"
          style={{
            background: "#1A1A23",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
          }}
        >
          <div className="px-3.5 py-2 border-b border-white/5">
            <p className="text-sm font-medium text-white truncate leading-tight">
              {name}
            </p>
            <p className="text-[11px] text-white/40 truncate mt-0.5">
              {user?.email}
            </p>
          </div>

          <button
            onClick={() => {
              setOpen(false)
              onNavigate("profile")
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-white/70 hover:text-white transition-colors hover:bg-[rgba(255,255,255,0.05)]"
          >
            <User size={15} />
            Profile
          </button>

          <button
            onClick={() => {
              setOpen(false)
              setFeedbackOpen(true)
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-white/70 hover:text-white transition-colors hover:bg-[rgba(255,255,255,0.05)]"
          >
            <MessageSquareHeart size={15} />
            Give feedback
          </button>

          <div className="h-px mx-2 my-1" style={{ background: "rgba(255,255,255,0.06)" }} />

          <button
            onClick={() => {
              setOpen(false)
              signOut()
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors text-[rgba(255,100,100,0.7)] hover:bg-[rgba(255,100,100,0.1)] hover:text-[#FF6B6B]"
          >
            <LogOut size={15} />
            Log out
          </button>
        </div>
      )}

      {feedbackOpen && (
        <FeedbackDialog
          target={{ kind: "general", page: window.location.hash.replace(/^#\/?/, "").split("/")[0] || "dashboard" }}
          onClose={() => setFeedbackOpen(false)}
        />
      )}
    </div>
  )
}