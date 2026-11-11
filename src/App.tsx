import { useCallback, useEffect, useState } from "react"
import { Menu } from "lucide-react"
import { AuthProvider, useAuth } from "@/lib/supabase/auth"
import Landing from "@/pages/Landing"
import Login from "@/pages/Login"
import Signup from "@/pages/Signup"
import ForgotPassword from "@/pages/ForgotPassword"
import ResetPassword from "@/pages/ResetPassword"
import CompleteProfile from "@/pages/CompleteProfile"
import Dashboard from "@/pages/Dashboard"
import Upload from "@/pages/Upload"
import Quiz from "@/pages/Quiz"
import Flashcards from "@/pages/Flashcards"
import Progress from "@/pages/Progress"
import Profile from "@/pages/Profile"
import Sidebar from "@/components/layout/Sidebar"
import AvatarMenu from "@/components/layout/AvatarMenu"

export type Screen =
  | "landing"
  | "dashboard"
  | "upload"
  | "quiz"
  | "flashcards"
  | "progress"
  | "profile"

export type Navigate = (screen: Screen, courseId?: string) => void

const appScreens: Screen[] = ["dashboard", "upload", "quiz", "flashcards", "progress", "profile"]

interface Route {
  screen: Screen
  /** Course to open directly, for "#/quiz/<courseId>" and "#/flashcards/<courseId>" */
  courseId?: string
}

/** "#/quiz" → quiz. Anything else (no hash, landing anchors, auth callbacks) is the landing page. */
function routeFromHash(): Route {
  const [name, courseId] = window.location.hash.replace(/^#\/?/, "").split("/")
  const screen = appScreens.find((s) => s === name)
  return screen ? { screen, courseId: courseId || undefined } : { screen: "landing" }
}

/** Keeps the current screen in the URL hash so reload, back and forward work. */
function useHashRoute(): [Route, Navigate] {
  const [route, setRoute] = useState<Route>(routeFromHash)

  useEffect(() => {
    const onHashChange = () => setRoute(routeFromHash())
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [])

  const navigate = useCallback<Navigate>((screen, courseId) => {
    window.location.hash =
      screen === "landing" ? "" : courseId ? `/${screen}/${courseId}` : `/${screen}`
    setRoute({ screen, courseId })
  }, [])

  return [route, navigate]
}

function AppContent() {
  const { user, loading, refreshUser, recoveringPassword } = useAuth()
  const [route, setScreen] = useHashRoute()
  // A signed-in user never lands on the marketing page
  const screen: Screen = user && route.screen === "landing" ? "dashboard" : route.screen
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authView, setAuthView] = useState<"login" | "signup" | "forgot">("login")

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#0F0F12" }}
      >
        <div className="w-8 h-8 rounded-xl animate-pulse" style={{ background: "#7C5CFF" }} />
      </div>
    )
  }

  // Opened from a password-reset email: choosing a new password comes first
  if (user && recoveringPassword) {
    return <ResetPassword />
  }

  if (screen === "landing") {
    return <Landing onEnter={() => setScreen("dashboard")} />
  }

  if (!user) {
    if (authView === "signup") {
      return <Signup onSwitchToLogin={() => setAuthView("login")} />
    }
    if (authView === "forgot") {
      return <ForgotPassword onBackToLogin={() => setAuthView("login")} />
    }
    return (
      <Login
        onSwitchToSignup={() => setAuthView("signup")}
        onForgotPassword={() => setAuthView("forgot")}
      />
    )
  }

  // Check if profile is complete (has full_name in metadata)
  const hasFullName = user.user_metadata?.full_name?.trim()
  if (!hasFullName) {
    return <CompleteProfile onComplete={refreshUser} />
  }

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "#0F0F12", color: "#EEEEF5" }}
    >
      <Sidebar
        screen={screen}
        onNavigate={setScreen}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar */}
        <div
          className="lg:hidden flex items-center gap-3 px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="Open menu"
            className="transition-colors duration-150 text-[rgba(255,255,255,0.45)] hover:text-[rgba(255,255,255,0.9)]"
          >
            <Menu size={20} />
          </button>
          <span className="font-black text-base">StudyForge</span>
          <div className="ml-auto">
            <AvatarMenu onNavigate={setScreen} />
          </div>
        </div>

        {/* Desktop top bar */}
        <div
          className="hidden lg:flex items-center justify-end px-6 py-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <AvatarMenu onNavigate={setScreen} />
        </div>

        <main className="flex-1 overflow-y-auto">
          {screen === "dashboard" && (
            <Dashboard onNavigate={setScreen} />
          )}
          {screen === "upload" && (
            <Upload onBack={() => setScreen("dashboard")} />
          )}
          {screen === "quiz" && (
            <Quiz key={route.courseId} initialCourseId={route.courseId} onBack={() => setScreen("dashboard")} />
          )}
          {screen === "flashcards" && (
            <Flashcards key={route.courseId} initialCourseId={route.courseId} onBack={() => setScreen("dashboard")} />
          )}
          {screen === "progress" && <Progress />}
          {screen === "profile" && (
            <Profile onBack={() => setScreen("dashboard")} />
          )}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
