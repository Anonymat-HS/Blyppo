import {
  LayoutDashboard,
  Upload,
  Brain,
  CreditCard,
  TrendingUp,
  X,
} from "lucide-react"
import type { Screen } from "@/App"

interface SidebarProps {
  screen: Screen
  onNavigate: (screen: Screen) => void
  isOpen: boolean
  onToggle: () => void
}

const navItems: { id: Screen; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "upload", label: "Upload Course", icon: Upload },
  { id: "quiz", label: "Quiz", icon: Brain },
  { id: "flashcards", label: "Flashcards", icon: CreditCard },
  { id: "progress", label: "Progress", icon: TrendingUp },
]

export default function Sidebar({
  screen,
  onNavigate,
  isOpen,
  onToggle,
}: SidebarProps) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        style={{
          background: "rgba(13,13,17,0.95)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(20px)",
        }}
        className={[
          "fixed lg:static inset-y-0 left-0 z-30",
          "w-60 flex flex-col h-screen shrink-0",
          "transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-5 py-5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <img
            src="/android-chrome-192x192.png"
            alt="StudyForge"
            className="w-10 h-10 rounded-xl shrink-0"
          />
          <span className="font-black text-base tracking-tight text-white">
            StudyForge
          </span>
          <button
            onClick={onToggle}
            aria-label="Close menu"
            className="ml-auto lg:hidden text-white/30 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ id, label, icon: Icon }) => {
            const active = screen === id
            return (
              <button
                key={id}
                onClick={() => {
                  onNavigate(id)
                  if (isOpen) onToggle()
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 border ${
                  active
                    ? "bg-[rgba(124,92,255,0.14)] border-[rgba(124,92,255,0.22)] text-[#A78BFA]"
                    : "border-transparent text-[rgba(255,255,255,0.45)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[rgba(255,255,255,0.9)]"
                }`}
              >
                <Icon size={17} />
                {label}
              </button>
            )
          })}
        </nav>

        {/* Bottom */}
        <div
          className="px-3 py-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div
            className="mx-0.5 p-3 rounded-xl"
            style={{
              background: "rgba(124,92,255,0.08)",
              border: "1px solid rgba(124,92,255,0.18)",
            }}
          >
            <p className="text-xs font-bold text-violet-300 mb-1">Beta</p>
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
              Free while in beta
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}
