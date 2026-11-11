import { Upload, Brain, Layers, Flame, Quote, BookOpen, AlertCircle, Sparkles, Trash2, Search, Play, Library } from "lucide-react"
import { getRandomQuote } from "@/lib/utils/quotes"
import type { Navigate, Screen } from "@/App"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/supabase/auth"
import { callGenerateFunction } from "@/lib/supabase/functions"
import { fetchCourses, fetchQuizCountsByCourses, fetchFlashcardCountsByCourses, deleteCourse } from "@/lib/api"
import ErrorState from "@/components/ui/ErrorState"
import { EmptyState, LoadingState, primaryButton } from "@/components/ui/PageStates"
import CourseBadge from "@/components/study/CourseBadge"
import { useStreak } from "@/hooks/useStreak"
import type { CourseWithCounts } from "@/lib/types"
import { useT } from "@/lib/i18n"

export default function Dashboard({
  onNavigate,
}: {
  onNavigate: Navigate
}) {
  const { user } = useAuth()
  const { t, locale } = useT()
  const streak = useStreak(user?.id)
  const [quote] = useState(() => getRandomQuote())
  const [courses, setCourses] = useState<CourseWithCounts[]>([])
  const [loading, setLoading] = useState(true)
  const [retryingCourse, setRetryingCourse] = useState<{ id: string; type: "quiz" | "flashcard" } | null>(null)
  const [retryError, setRetryError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<"recent" | "name">("recent")
  // Course whose deletion is awaiting confirmation, and course being deleted
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)
  const [deletingCourse, setDeletingCourse] = useState<string | null>(null)

  const displayName = user?.user_metadata?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? t("there")

  const loadCourses = async () => {
    const coursesData = await fetchCourses()
    const courseIds = coursesData.map((c) => c.id)
    const [quizCounts, flashCounts] = await Promise.all([
      fetchQuizCountsByCourses(courseIds),
      fetchFlashcardCountsByCourses(courseIds),
    ])

    const coursesWithStats: CourseWithCounts[] = coursesData.map((course) => ({
      ...course,
      quiz_count: quizCounts[course.id] ?? 0,
      flashcard_count: flashCounts[course.id] ?? 0,
    }))

    setCourses(coursesWithStats)
  }

  const loadDashboard = () => {
    setLoading(true)
    setLoadError(null)
    loadCourses()
      .catch((err) => setLoadError((err as Error).message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadDashboard()
    // loadDashboard is recreated on every render; it only reads state setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRetry = async (courseId: string, type: "quiz" | "flashcard") => {
    setRetryingCourse({ id: courseId, type })
    setRetryError(null)

    try {
      if (type === "quiz") {
        await callGenerateFunction("generate-quiz", courseId, "numberOfQuestions", 10, () => {})
      } else {
        await callGenerateFunction("generate-flashcards", courseId, "numberOfCards", 15, () => {})
      }
      await loadCourses()
    } catch (err) {
      setRetryError((err as Error).message)
    } finally {
      setRetryingCourse(null)
    }
  }

  const handleDelete = async (courseId: string) => {
    setDeletingCourse(courseId)
    setRetryError(null)
    try {
      await deleteCourse(courseId)
      setCourses((list) => list.filter((c) => c.id !== courseId))
    } catch (err) {
      setRetryError(t("Could not delete the course: {error}", { error: (err as Error).message }))
    } finally {
      setDeletingCourse(null)
      setConfirmingDelete(null)
    }
  }

  const search = query.trim().toLowerCase()
  const visibleCourses = courses
    .filter((c) => c.titre.toLowerCase().includes(search))
    .sort((a, b) =>
      sort === "name"
        ? a.titre.localeCompare(b.titre)
        : b.created_at.localeCompare(a.created_at)
    )

  const totalQuizzes = courses.reduce((s, c) => s + c.quiz_count, 0)
  const totalFlashcards = courses.reduce((s, c) => s + c.flashcard_count, 0)

  // Most recent course that has a quiz
  const playable = [...courses]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .find((c) => c.quiz_count > 0)

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return t("Good morning, {name}", { name: displayName })
    if (h < 18) return t("Good afternoon, {name}", { name: displayName })
    return t("Good evening, {name}", { name: displayName })
  })()

  const today = new Date().toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  if (loadError) {
    return <ErrorState message={loadError} onRetry={loadDashboard} />
  }

  if (loading) {
    return <LoadingState label={t("Loading your dashboard...")} />
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white">
            {greeting} 👋
          </h1>
          <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.38)" }}>
            {today}
          </p>
        </div>
        {streak !== null && streak > 0 && (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold bg-spark/10 border border-spark/25 text-spark">
            <Flame size={15} />
            {streak === 1 ? t("1-day streak") : t("{n}-day streak", { n: streak })}
          </div>
        )}
      </div>

      {/* Quick play */}
      {playable && (
        <div className="relative overflow-hidden mb-8 p-5 sm:p-6 rounded-3xl border border-brand/30 bg-gradient-to-br from-brand/25 via-brand/10 to-transparent">
          <div aria-hidden="true" className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-spark/10 blur-2xl" />
          <div className="relative flex items-center gap-4 flex-wrap">
            <CourseBadge id={playable.id} title={playable.titre} size={52} />
            <div className="flex-1 min-w-[10rem]">
              <p className="text-[11px] font-bold tracking-wider text-spark">{t("QUICK PLAY")}</p>
              <p className="text-lg font-black text-white leading-tight truncate">{playable.titre}</p>
              <p className="text-xs text-white/45 mt-0.5">
                {t("{n} questions · about {min} min", { n: playable.quiz_count, min: Math.max(1, Math.round(playable.quiz_count / 2)) })}
              </p>
            </div>
            <button onClick={() => onNavigate("quiz", playable.id)} className={primaryButton}>
              <Play size={15} className="fill-current" />
              {t("Play quiz")}
            </button>
          </div>
        </div>
      )}

      {/* Stats (hidden until there is something to count) */}
      {courses.length > 0 && (
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-8">
          {[
            { label: "Courses", value: courses.length, color: "#A78BFA", icon: Library },
            { label: "Questions", value: totalQuizzes, color: "#22D3EE", icon: Brain },
            { label: "Flashcards", value: totalFlashcards, color: "#FFC83D", icon: Layers },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="p-3 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-3 bg-white/[0.03] border border-white/[0.07]">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: color + "1A", color }}
              >
                <Icon size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-black leading-none text-white">{value}</p>
                <p className="text-[10px] sm:text-[11px] font-semibold mt-1 uppercase tracking-wider text-white/35 truncate">{t(label)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {courses.length > 0 && (
        <div className="flex flex-wrap gap-2.5 mb-8">
          <button onClick={() => onNavigate("upload")} className={`${primaryButton} px-4 py-2.5`}>
            <Upload size={15} />
            {t("Upload new course")}
          </button>
          {courses.length > 0 && [
            { screen: "quiz" as Screen, icon: Brain, label: "Start a quiz" },
            { screen: "flashcards" as Screen, icon: Layers, label: "Review flashcards" },
          ].map(({ screen, icon: Icon, label }) => (
            <button
              key={screen}
              onClick={() => onNavigate(screen)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[rgba(255,255,255,0.9)] hover:border-[rgba(255,255,255,0.15)]"
            >
              <Icon size={15} />
              {t(label)}
            </button>
          ))}
        </div>
      )}

      {/* Retry error banner */}
      {retryError && (
        <div
          className="mb-4 p-3 rounded-xl flex items-center gap-2 text-sm"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#FCA5A5",
          }}
        >
          <AlertCircle size={14} className="shrink-0" />
          {retryError}
        </div>
      )}

      {/* Empty state */}
      {courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={t("Your first quiz is one upload away")}
          text={t("Upload a course (PDF, TXT or Markdown) and Kwizo writes a quiz and a flashcard deck from it.")}
          action={
            <button onClick={() => onNavigate("upload")} className={primaryButton}>
              <Upload size={15} />
              {t("Upload a course")}
            </button>
          }
        />
      ) : (
        <>
          {/* Recent courses */}
          <div>
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <h2 className="text-base font-bold">{t("Your courses")}</h2>
              {courses.length > 1 && (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t("Search courses")}
                      aria-label={t("Search courses")}
                      className="w-44 sm:w-56 pl-8 pr-3 py-1.5 rounded-lg text-sm text-white outline-none bg-white/5 border border-white/10 focus:border-[#7C5CFF]/50 placeholder:text-white/30"
                    />
                  </div>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as "recent" | "name")}
                    aria-label={t("Sort courses")}
                    className="px-2.5 py-1.5 rounded-lg text-sm text-white/80 outline-none bg-[#1A1A23] border border-white/10 focus:border-[#7C5CFF]/50"
                  >
                    <option value="recent">{t("Most recent")}</option>
                    <option value="name">{t("Name (A-Z)")}</option>
                  </select>
                </div>
              )}
            </div>

            {visibleCourses.length === 0 && (
              <p className="text-sm text-white/40">{t("No course matches \"{query}\".", { query: query.trim() })}</p>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              {visibleCourses.map((course) => {
                const needsQuiz = course.quiz_count === 0
                const needsFlashcard = course.flashcard_count === 0
                const isRetryingQuiz = retryingCourse?.id === course.id && retryingCourse?.type === "quiz"
                const isRetryingFlashcard = retryingCourse?.id === course.id && retryingCourse?.type === "flashcard"

                return (
                  <div
                    key={course.id}
                    className="group p-5 rounded-2xl transition-all duration-200 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.12)]"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <CourseBadge id={course.id} title={course.titre} />
                        <div>
                          <h3 className="font-bold text-sm leading-tight text-white">
                            {course.titre}
                          </h3>
                          <p
                            className="text-xs mt-0.5"
                            style={{ color: "rgba(255,255,255,0.38)" }}
                          >
                            {new Date(course.created_at).toLocaleDateString(locale)}
                          </p>
                        </div>
                      </div>

                      {confirmingDelete === course.id ? (
                        <div className="flex items-center gap-1.5 shrink-0 text-xs">
                          <button
                            onClick={() => handleDelete(course.id)}
                            disabled={deletingCourse === course.id}
                            className="px-2.5 py-1 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 transition-colors"
                          >
                            {deletingCourse === course.id ? t("Deleting...") : t("Delete")}
                          </button>
                          <button
                            onClick={() => setConfirmingDelete(null)}
                            disabled={deletingCourse === course.id}
                            className="px-2.5 py-1 rounded-lg text-white/60 border border-white/10 hover:bg-white/5 transition-colors"
                          >
                            {t("Cancel")}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmingDelete(course.id)}
                          aria-label={t("Delete {course}", { course: course.titre })}
                          title={t("Delete course")}
                          className="shrink-0 p-1.5 rounded-lg text-white/25 hover:text-[#FCA5A5] hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    {confirmingDelete === course.id && (
                      <p className="text-xs mb-3 text-[#FCA5A5]">
                        {t("This deletes the course, its questions, flashcards and your progress on it.")}
                      </p>
                    )}

                    <div
                      className="flex items-center gap-3 text-xs flex-wrap"
                      style={{ color: "rgba(255,255,255,0.28)" }}
                    >
                      {needsQuiz && !isRetryingQuiz ? (
                        <button
                          onClick={() => handleRetry(course.id, "quiz")}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all bg-spark/10 border border-spark/25 text-spark hover:bg-spark/20"
                        >
                          <Sparkles size={11} />
                          {t("Generate quiz")}
                        </button>
                      ) : isRetryingQuiz ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: "rgba(124,92,255,0.12)", color: "#A78BFA" }}>
                          <div className="w-3 h-3 border border-t-transparent rounded-full animate-spin" style={{ borderColor: "#A78BFA", borderTopColor: "transparent" }} />
                          {t("Generating quiz...")}
                        </span>
                      ) : (
                        <span style={{ color: "rgba(255,255,255,0.4)" }}>
                          {course.quiz_count === 1 ? t("{n} question", { n: course.quiz_count }) : t("{n} questions", { n: course.quiz_count })}
                        </span>
                      )}

                      <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>

                      {needsFlashcard && !isRetryingFlashcard ? (
                        <button
                          onClick={() => handleRetry(course.id, "flashcard")}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all bg-spark/10 border border-spark/25 text-spark hover:bg-spark/20"
                        >
                          <Sparkles size={11} />
                          {t("Generate flashcards")}
                        </button>
                      ) : isRetryingFlashcard ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: "rgba(124,92,255,0.12)", color: "#A78BFA" }}>
                          <div className="w-3 h-3 border border-t-transparent rounded-full animate-spin" style={{ borderColor: "#A78BFA", borderTopColor: "transparent" }} />
                          {t("Generating flashcards...")}
                        </span>
                      ) : (
                        <span style={{ color: "rgba(255,255,255,0.4)" }}>
                          {course.flashcard_count === 1 ? t("{n} flashcard", { n: course.flashcard_count }) : t("{n} flashcards", { n: course.flashcard_count })}
                        </span>
                      )}
                    </div>

                    {(!needsQuiz || !needsFlashcard) && (
                      <div className="flex gap-2 mt-4">
                        {!needsQuiz && (
                          <button
                            onClick={() => onNavigate("quiz", course.id)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-brand hover:bg-brand-hover transition-colors"
                          >
                            <Play size={12} className="fill-current" />
                            {t("Play quiz")}
                          </button>
                        )}
                        {!needsFlashcard && (
                          <button
                            onClick={() => onNavigate("flashcards", course.id)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white/70 border border-white/10 hover:bg-white/5 transition-colors"
                          >
                            <Layers size={13} />
                            {t("Flashcards")}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

        </>
      )}

      {/* Daily quote */}
      <div
        className="mt-6 p-5 rounded-2xl"
        style={{
          background: "rgba(255,200,61,0.04)",
          border: "1px solid rgba(255,200,61,0.14)",
        }}
      >
        <div className="flex items-start gap-3">
          <Quote size={16} className="shrink-0 mt-0.5 text-spark" />
          <div>
            <p className="text-sm italic" style={{ color: "rgba(255,255,255,0.7)" }}>
              "{quote.text}"
            </p>
            <p className="text-xs mt-2 font-medium text-spark/70">
              — {quote.author}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}