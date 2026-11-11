import {
  LayoutDashboard,
  Upload,
  Brain,
  Layers,
  TrendingUp,
  Flame,
  X,
} from "lucide-react"
import type { Screen } from "@/App"
import { Logo } from "@/components/ui/Logo"
import { useAuth } from "@/lib/supabase/auth"
import { useStreak } from "@/hooks/useStreak"
import { useT } from "@/lib/i18n"

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
  { id: "flashcards", label: "Flashcards", icon: Layers },
  { id: "progress", label: "Progress", icon: TrendingUp },
]

export default function Sidebar({
  screen,
  onNavigate,
  isOpen,
  onToggle,
}: SidebarProps) {
  const { user } = useAuth()
  const { t } = useT()
  // Reloaded on every screen change, so a finished quiz shows up right away
  const streak = useStreak(user?.id, screen)

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
          <Logo size="md" byline />
          <button
            onClick={onToggle}
            aria-label={t("Close menu")}
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
                aria-current={active ? "page" : undefined}
                className={`relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 border ${
                  active
                    ? "bg-brand/15 border-brand/25 text-white"
                    : "border-transparent text-white/45 hover:bg-white/5 hover:text-white/90"
                }`}
              >
                {active && <span className="absolute -left-3 top-2 bottom-2 w-1 rounded-r-full bg-spark" aria-hidden="true" />}
                <Icon size={17} className={active ? "text-brand-soft" : ""} />
                {t(label)}
              </button>
            )
          })}
        </nav>

        {/* Bottom */}
        <div
          className="px-3 py-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          {streak === null ? (
            <div className="mx-0.5 h-[62px] rounded-xl bg-white/[0.03]" aria-hidden="true" />
          ) : (
            <div
              className={`mx-0.5 p-3 rounded-xl flex items-center gap-3 border ${
                streak > 0 ? "bg-spark/[0.08] border-spark/25" : "bg-white/[0.03] border-white/[0.07]"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  streak > 0 ? "bg-spark/15 text-spark" : "bg-white/5 text-white/30"
                }`}
              >
                <Flame size={18} />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-black ${streak > 0 ? "text-spark" : "text-white/70"}`}>
                  {streak === 1 ? t("1-day streak") : t("{n}-day streak", { n: streak })}
                </p>
                <p className="text-[11px] text-white/35">
                  {streak > 0 ? t("Study every day to grow it") : t("Answer a question to start one")}
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
