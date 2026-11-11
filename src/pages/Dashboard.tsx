import { Upload, Brain, CreditCard, Flame, ArrowRight, Quote, BookOpen, AlertCircle, RefreshCw, Trash2, Search } from "lucide-react"
import { getRandomQuote } from "@/lib/utils/quotes"
import type { Navigate, Screen } from "@/App"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/supabase/auth"
import { callGenerateFunction } from "@/lib/supabase/functions"
import { fetchCourses, fetchQuizCountsByCourses, fetchFlashcardCountsByCourses, deleteCourse } from "@/lib/api"
import ErrorState from "@/components/ui/ErrorState"
import type { CourseWithCounts } from "@/lib/types"

export default function Dashboard({
  onNavigate,
}: {
  onNavigate: Navigate
}) {
  const { user } = useAuth()
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

  const displayName = user?.user_metadata?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there"

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
      setRetryError(`Could not delete the course: ${(err as Error).message}`)
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

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return "Good morning"
    if (h < 18) return "Good afternoon"
    return "Good evening"
  })()

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  if (loadError) {
    return <ErrorState message={loadError} onRetry={loadDashboard} />
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: "#7C5CFF", borderTopColor: "transparent" }} />
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white">
            {greeting}, {displayName} 👋
          </h1>
          <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.38)" }}>
            {today}
          </p>
        </div>
        {totalQuizzes > 0 && (
          <div
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold"
            style={{
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.22)",
              color: "#FCD34D",
            }}
          >
            <Flame size={15} />
            {courses.length} course{courses.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        {[
          { label: "Courses", value: courses.length.toString(), color: "#7C5CFF" },
          { label: "Quiz questions", value: totalQuizzes.toString(), color: "#00D9FF" },
          { label: "Flashcards", value: totalFlashcards.toString(), color: "#F59E0B" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="p-4 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <p
              className="text-[11px] font-semibold mb-1.5 uppercase tracking-wider"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              {label}
            </p>
            <p className="text-2xl font-black" style={{ color }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2.5 mb-8">
        <button
          onClick={() => onNavigate("upload")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 bg-[#7C5CFF] hover:bg-[#8B6BFF] hover:shadow-[0_0_20px_rgba(124,92,255,0.35)]"
        >
          <Upload size={15} />
          Upload new course
        </button>
        {courses.length > 0 && [
          { screen: "quiz" as Screen, icon: Brain, label: "Start a quiz" },
          { screen: "flashcards" as Screen, icon: CreditCard, label: "Review flashcards" },
        ].map(({ screen, icon: Icon, label }) => (
          <button
            key={screen}
            onClick={() => onNavigate(screen)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[rgba(255,255,255,0.9)] hover:border-[rgba(255,255,255,0.15)]"
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

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
        <div
          className="p-8 rounded-2xl text-center"
          style={{
            background: "rgba(124,92,255,0.05)",
            border: "1px dashed rgba(124,92,255,0.25)",
          }}
        >
          <BookOpen size={36} className="mx-auto mb-3" style={{ color: "rgba(124,92,255,0.5)" }} />
          <p className="font-bold text-sm text-white mb-1">No courses yet</p>
          <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
            Upload your first course to start generating quizzes and flashcards.
          </p>
          <button
            onClick={() => onNavigate("upload")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: "#7C5CFF" }}
          >
            <Upload size={14} />
            Upload a course
          </button>
        </div>
      ) : (
        <>
          {/* Recent courses */}
          <div>
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <h2 className="text-base font-bold">Your courses</h2>
              {courses.length > 1 && (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search courses"
                      aria-label="Search courses"
                      className="w-44 sm:w-56 pl-8 pr-3 py-1.5 rounded-lg text-sm text-white outline-none bg-white/5 border border-white/10 focus:border-[#7C5CFF]/50 placeholder:text-white/30"
                    />
                  </div>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as "recent" | "name")}
                    aria-label="Sort courses"
                    className="px-2.5 py-1.5 rounded-lg text-sm text-white/80 outline-none bg-[#1A1A23] border border-white/10 focus:border-[#7C5CFF]/50"
                  >
                    <option value="recent">Most recent</option>
                    <option value="name">Name (A-Z)</option>
                  </select>
                </div>
              )}
            </div>

            {visibleCourses.length === 0 && (
              <p className="text-sm text-white/40">No course matches "{query.trim()}".</p>
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
                        <div
                          className="w-10 h-10 rounded-xl text-lg flex items-center justify-center shrink-0"
                          style={{
                            background: "rgba(124,92,255,0.1)",
                            border: "1px solid rgba(124,92,255,0.2)",
                          }}
                        >
                          📄
                        </div>
                        <div>
                          <h3 className="font-bold text-sm leading-tight text-white">
                            {course.titre}
                          </h3>
                          <p
                            className="text-xs mt-0.5"
                            style={{ color: "rgba(255,255,255,0.38)" }}
                          >
                            {new Date(course.created_at).toLocaleDateString()}
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
                            {deletingCourse === course.id ? "Deleting..." : "Delete"}
                          </button>
                          <button
                            onClick={() => setConfirmingDelete(null)}
                            disabled={deletingCourse === course.id}
                            className="px-2.5 py-1 rounded-lg text-white/60 border border-white/10 hover:bg-white/5 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmingDelete(course.id)}
                          aria-label={`Delete ${course.titre}`}
                          title="Delete course"
                          className="shrink-0 p-1.5 rounded-lg text-white/25 hover:text-[#FCA5A5] hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    {confirmingDelete === course.id && (
                      <p className="text-xs mb-3 text-[#FCA5A5]">
                        This deletes the course, its questions, flashcards and your progress on it.
                      </p>
                    )}

                    <div
                      className="flex items-center gap-3 text-xs flex-wrap"
                      style={{ color: "rgba(255,255,255,0.28)" }}
                    >
                      {needsQuiz && !isRetryingQuiz ? (
                        <button
                          onClick={() => handleRetry(course.id, "quiz")}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-[#FCA5A5] hover:bg-[rgba(239,68,68,0.18)]"
                        >
                          <RefreshCw size={11} />
                          Retry quiz
                        </button>
                      ) : isRetryingQuiz ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: "rgba(124,92,255,0.12)", color: "#A78BFA" }}>
                          <div className="w-3 h-3 border border-t-transparent rounded-full animate-spin" style={{ borderColor: "#A78BFA", borderTopColor: "transparent" }} />
                          Generating quiz...
                        </span>
                      ) : (
                        <span style={{ color: "rgba(255,255,255,0.4)" }}>
                          {course.quiz_count} question{course.quiz_count !== 1 ? "s" : ""}
                        </span>
                      )}

                      <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>

                      {needsFlashcard && !isRetryingFlashcard ? (
                        <button
                          onClick={() => handleRetry(course.id, "flashcard")}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-[#FCA5A5] hover:bg-[rgba(239,68,68,0.18)]"
                        >
                          <RefreshCw size={11} />
                          Retry flashcards
                        </button>
                      ) : isRetryingFlashcard ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: "rgba(124,92,255,0.12)", color: "#A78BFA" }}>
                          <div className="w-3 h-3 border border-t-transparent rounded-full animate-spin" style={{ borderColor: "#A78BFA", borderTopColor: "transparent" }} />
                          Generating flashcards...
                        </span>
                      ) : (
                        <span style={{ color: "rgba(255,255,255,0.4)" }}>
                          {course.flashcard_count} flashcard{course.flashcard_count !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    {(!needsQuiz || !needsFlashcard) && (
                      <div className="flex gap-2 mt-4">
                        {!needsQuiz && (
                          <button
                            onClick={() => onNavigate("quiz", course.id)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#C4B5FD] bg-[#7C5CFF]/15 border border-[#7C5CFF]/25 hover:bg-[#7C5CFF]/25 transition-colors"
                          >
                            <Brain size={13} />
                            Quiz
                          </button>
                        )}
                        {!needsFlashcard && (
                          <button
                            onClick={() => onNavigate("flashcards", course.id)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white/70 border border-white/10 hover:bg-white/5 transition-colors"
                          >
                            <CreditCard size={13} />
                            Flashcards
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Continue studying banner */}
          {courses.some((c) => c.quiz_count > 0) && (
            <div
              className="mt-6 p-4 sm:p-5 rounded-2xl flex items-center justify-between gap-3 sm:gap-4"
              style={{
                background: "rgba(124,92,255,0.07)",
                border: "1px solid rgba(124,92,255,0.18)",
              }}
            >
              <div className="min-w-0">
                <p className="font-bold text-sm">Continue where you left off</p>
                <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {courses.find((c) => c.quiz_count > 0)?.titre ?? "No courses yet"}
                </p>
              </div>
              <button
                onClick={() => onNavigate("quiz", courses.find((c) => c.quiz_count > 0)?.id)}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 bg-[rgba(124,92,255,0.2)] border border-[rgba(124,92,255,0.3)] text-[#C4B5FD] hover:bg-[rgba(124,92,255,0.3)]"
              >
                Resume
                <ArrowRight size={13} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Daily quote */}
      <div
        className="mt-6 p-5 rounded-2xl"
        style={{
          background: "rgba(0,217,255,0.04)",
          border: "1px solid rgba(0,217,255,0.12)",
        }}
      >
        <div className="flex items-start gap-3">
          <Quote size={16} className="shrink-0 mt-0.5" style={{ color: "#00D9FF" }} />
          <div>
            <p className="text-sm italic" style={{ color: "rgba(255,255,255,0.7)" }}>
              "{quote.text}"
            </p>
            <p className="text-xs mt-2 font-medium" style={{ color: "rgba(0,217,255,0.6)" }}>
              — {quote.author}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}