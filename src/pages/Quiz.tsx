import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, CheckCircle, XCircle, ArrowRight, RotateCcw, BookOpen, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/supabase/auth"
import {
  fetchCourses,
  fetchQuizCountsByCourses,
  fetchQuestionsForCourse,
  recordQuizAnswer,
  recordQuizAttempt,
} from "@/lib/api"
import { findCorrectIndex, prepareQuestions } from "@/lib/utils/quiz"
import ErrorState from "@/components/ui/ErrorState"
import SaveWarning from "@/components/ui/SaveWarning"
import type { CourseSummary, QuizQuestion } from "@/lib/types"

interface CourseWithCount extends CourseSummary {
  quiz_count: number
}

const SAVE_WARNING = "Your progress could not be saved. Check your connection."

export default function Quiz({
  onBack,
  initialCourseId,
}: {
  onBack: () => void
  /** Course to start right away (opened from a Dashboard card) */
  initialCourseId?: string
}) {
  const { user } = useAuth()
  const [courses, setCourses] = useState<CourseWithCount[]>([])
  const [selectedCourse, setSelectedCourse] = useState<CourseWithCount | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingQuiz, setLoadingQuiz] = useState(false)

  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveFailed, setSaveFailed] = useState(false)
  // Option picked for each question of the session, in order
  const [answers, setAnswers] = useState<number[]>([])

  const loadCourses = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const coursesData = await fetchCourses()
      const counts = await fetchQuizCountsByCourses(coursesData.map((c) => c.id))
      const withCounts = coursesData.map((c) => ({ ...c, quiz_count: counts[c.id] ?? 0 }))
      setCourses(withCounts)

      const initial = withCounts.find((c) => c.id === initialCourseId)
      if (initial) await startQuiz(initial)
    } catch (err) {
      setLoadError((err as Error).message)
    } finally {
      setLoading(false)
    }
    // startQuiz only uses state setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCourseId])

  useEffect(() => {
    loadCourses()
  }, [loadCourses])

  async function startQuiz(course: CourseWithCount) {
    setSelectedCourse(course)
    setLoadingQuiz(true)
    setLoadError(null)
    setSaveFailed(false)

    try {
      const data = await fetchQuestionsForCourse(course.id)
      setQuestions(prepareQuestions(data))
    } catch (err) {
      setSelectedCourse(null)
      setLoadError((err as Error).message)
    } finally {
      setLoadingQuiz(false)
    }
    setCurrent(0)
    setScore(0)
    setFinished(false)
    setSelected(null)
    setAnswers([])
  }

  const q = questions[current]
  const total = questions.length
  const correctIndex = q ? findCorrectIndex(q) : -1

  const handleSelect = (idx: number) => {
    if (selected !== null || idx >= q.options.length) return
    setSelected(idx)
    setAnswers((a) => [...a, idx])
    const isCorrect = idx === correctIndex
    if (isCorrect) setScore((s) => s + 1)

    if (!user || !q) return
    recordQuizAnswer(user.id, q.id, isCorrect).catch(() => setSaveFailed(true))
  }

  const handleNext = () => {
    if (current + 1 >= total) {
      setFinished(true)
      if (user && selectedCourse) {
        recordQuizAttempt(user.id, selectedCourse.id, score, total).catch(() =>
          setSaveFailed(true)
        )
      }
    } else {
      setCurrent((c) => c + 1)
      setSelected(null)
    }
  }

  const reset = () => {
    setCurrent(0)
    setSelected(null)
    setScore(0)
    setFinished(false)
    setSaveFailed(false)
    setAnswers([])
    setQuestions((qs) => prepareQuestions(qs))
  }

  // Keyboard: 1-4 or A-D to answer, Enter or Space for the next question
  const inQuiz = Boolean(selectedCourse) && !loadingQuiz && !finished && questions.length > 0
  useEffect(() => {
    if (!inQuiz) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const key = e.key.toLowerCase()
      const idx = "1234".includes(key) ? Number(key) - 1 : "abcd".indexOf(key)
      if (key.length === 1 && idx >= 0 && idx < 4) {
        handleSelect(idx)
      } else if ((key === "enter" || key === " ") && selected !== null) {
        // Let the focused control handle its own Enter/Space
        if ((e.target as HTMLElement).closest("button, a, input, select")) return
        e.preventDefault()
        handleNext()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  })

  if (loadError) {
    return <ErrorState message={loadError} onRetry={loadCourses} />
  }

  // Loading state
  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 size={24} className="animate-spin mx-auto mb-3" style={{ color: "#7C5CFF" }} />
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Loading courses...</p>
        </div>
      </div>
    )
  }

  // No courses state
  if (courses.length === 0) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm mb-6 transition-colors duration-150 text-[rgba(255,255,255,0.38)] hover:text-[rgba(255,255,255,0.8)]"
        >
          <ChevronLeft size={15} />
          Back
        </button>
        <div
          className="p-8 rounded-2xl text-center"
          style={{
            background: "rgba(124,92,255,0.05)",
            border: "1px dashed rgba(124,92,255,0.25)",
          }}
        >
          <BookOpen size={36} className="mx-auto mb-3" style={{ color: "rgba(124,92,255,0.5)" }} />
          <p className="font-bold text-sm text-white mb-1">No courses yet</p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            Upload a course first, then generate quiz questions from it.
          </p>
        </div>
      </div>
    )
  }

  // Course selection
  if (!selectedCourse) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm mb-6 transition-colors duration-150 text-[rgba(255,255,255,0.38)] hover:text-[rgba(255,255,255,0.8)]"
        >
          <ChevronLeft size={15} />
          Back
        </button>

        <h1 className="text-xl font-bold text-white mb-1">Select a course</h1>
        <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.38)" }}>
          Choose which course you want to quiz yourself on
        </p>

        <div className="space-y-3">
          {courses.map((course) => (
            <button
              key={course.id}
              onClick={() => startQuiz(course)}
              className="w-full p-4 rounded-xl text-left transition-all duration-200 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(124,92,255,0.3)]"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-white">{course.titre}</span>
                <span
                  className="text-xs px-2 py-1 rounded-lg"
                  style={{
                    background: course.quiz_count > 0 ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
                    color: course.quiz_count > 0 ? "#4ADE80" : "#FCD34D",
                    border: `1px solid ${course.quiz_count > 0 ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)"}`,
                  }}
                >
                  {course.quiz_count} questions
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Loading quiz
  if (loadingQuiz) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 size={24} className="animate-spin mx-auto mb-3" style={{ color: "#7C5CFF" }} />
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Loading quiz...</p>
        </div>
      </div>
    )
  }

  // No questions for this course
  if (questions.length === 0) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto">
        <button
          onClick={() => setSelectedCourse(null)}
          className="flex items-center gap-1.5 text-sm mb-6 transition-colors duration-150 text-[rgba(255,255,255,0.38)] hover:text-[rgba(255,255,255,0.8)]"
        >
          <ChevronLeft size={15} />
          Back to courses
        </button>
        <div
          className="p-8 rounded-2xl text-center"
          style={{
            background: "rgba(245,158,11,0.05)",
            border: "1px dashed rgba(245,158,11,0.25)",
          }}
        >
          <BookOpen size={20} className="mx-auto mb-3" style={{ color: "rgba(245,158,11,0.5)" }} />
          <p className="font-bold text-sm text-white mb-1">No quiz questions yet</p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.38)" }}>
            Generate quiz questions from the Dashboard first.
          </p>
        </div>
      </div>
    )
  }

  // Finished
  if (finished) {
    const pct = Math.round((score / total) * 100)
    const mistakes = questions
      .map((question, i) => ({ question, picked: question.options[answers[i]] }))
      .filter(({ question, picked }) => picked !== undefined && picked !== question.bonne_reponse)
    const grade =
      pct >= 80
        ? { label: "Excellent!", color: "#22C55E", bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.25)" }
        : pct >= 60
        ? { label: "Good effort!", color: "#F59E0B", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" }
        : { label: "Keep going!", color: "#EF4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.25)" }

    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto flex flex-col items-center text-center pt-16">
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
          style={{ background: grade.bg, border: `1px solid ${grade.border}` }}
        >
          <span className="text-4xl font-black" style={{ color: grade.color }}>
            {pct}%
          </span>
        </div>
        <h2 className="text-3xl font-black text-white mb-2">{grade.label}</h2>
        <p className="mb-2" style={{ color: "rgba(255,255,255,0.38)" }}>
          {score} correct out of {total} questions
        </p>
        <p className="text-sm mb-10" style={{ color: "rgba(255,255,255,0.28)" }}>
          {selectedCourse?.titre} · Quiz complete
        </p>

        {saveFailed && <SaveWarning message={SAVE_WARNING} />}

        <div className="flex gap-3 sm:gap-4 mb-10">
          <div
            className="px-5 py-3 rounded-xl text-center"
            style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}
          >
            <p className="text-xl font-black" style={{ color: "#4ADE80" }}>{score}</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.38)" }}>Correct</p>
          </div>
          <div
            className="px-5 py-3 rounded-xl text-center"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <p className="text-xl font-black" style={{ color: "#F87171" }}>{total - score}</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.38)" }}>Incorrect</p>
          </div>
        </div>

        {mistakes.length > 0 && (
          <div className="w-full text-left mb-10">
            <h3 className="text-sm font-bold text-white mb-3">
              Review your mistakes ({mistakes.length})
            </h3>
            <div className="space-y-3">
              {mistakes.map(({ question, picked }) => (
                <div
                  key={question.id}
                  className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]"
                >
                  <p className="text-sm font-semibold text-white mb-2">{question.question}</p>
                  <p className="text-xs mb-1 text-[#FCA5A5]">Your answer: {picked}</p>
                  <p className="text-xs text-[#86EFAC]">Correct answer: {question.bonne_reponse}</p>
                  {question.explication && (
                    <p className="text-xs mt-2 leading-relaxed text-white/50">
                      {question.explication}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 bg-[#7C5CFF] hover:bg-[#8B6BFF]"
          >
            <RotateCcw size={14} />
            Retry quiz
          </button>
          <button
            onClick={() => setSelectedCourse(null)}
            className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[rgba(255,255,255,0.9)]"
          >
            Choose another course
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <button
        onClick={() => setSelectedCourse(null)}
        className="flex items-center gap-1.5 text-sm mb-6 transition-colors duration-150 text-[rgba(255,255,255,0.38)] hover:text-[rgba(255,255,255,0.8)]"
      >
        <ChevronLeft size={15} />
        Exit quiz
      </button>

      <div className="flex items-center justify-between mb-1.5">
        <div>
          <p className="text-[11px] font-semibold tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>
            {selectedCourse?.titre?.toUpperCase()}
          </p>
          <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
            Question {current + 1} of {total}
          </p>
        </div>
        <div
          className="px-3 py-1 rounded-lg text-sm font-bold"
          style={{
            background: "rgba(124,92,255,0.12)",
            border: "1px solid rgba(124,92,255,0.2)",
            color: "#C4B5FD",
          }}
        >
          {score} / {current + (selected !== null ? 1 : 0)} correct
        </div>
      </div>

      <div
        className="h-1.5 rounded-full overflow-hidden mb-8"
        style={{ background: "rgba(255,255,255,0.07)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${(current / total) * 100}%`,
            background: "linear-gradient(90deg, #7C5CFF, #A78BFA)",
            transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </div>

      {saveFailed && <SaveWarning message={SAVE_WARNING} />}

      <h2 className="text-xl md:text-2xl font-bold leading-snug text-white mb-7">
        {q.question}
      </h2>

      <div className="space-y-3 mb-6">
        {q.options.map((opt, idx) => {
          const isSelected = selected === idx
          const isCorrect = idx === correctIndex
          const revealed = selected !== null

          let bg = "rgba(255,255,255,0.03)"
          let border = "rgba(255,255,255,0.09)"
          let color = "rgba(255,255,255,0.75)"

          if (revealed) {
            if (isCorrect) {
              bg = "rgba(34,197,94,0.1)"
              border = "rgba(34,197,94,0.4)"
              color = "#86EFAC"
            } else if (isSelected) {
              bg = "rgba(239,68,68,0.1)"
              border = "rgba(239,68,68,0.4)"
              color = "#FCA5A5"
            } else {
              bg = "transparent"
              border = "rgba(255,255,255,0.05)"
              color = "rgba(255,255,255,0.28)"
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              disabled={revealed}
              className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl text-left transition-all duration-200 enabled:hover:bg-[rgba(255,255,255,0.06)]! enabled:hover:border-[rgba(255,255,255,0.18)]!"
              style={{
                background: bg,
                border: `1px solid ${border}`,
                color,
                cursor: revealed ? "default" : "pointer",
              }}
            >
              <span
                className="w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0"
                style={{
                  border: `1px solid currentColor`,
                  opacity: revealed && !isCorrect && !isSelected ? 0.4 : 1,
                }}
              >
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="font-medium flex-1">{opt}</span>
              {revealed && isCorrect && (
                <CheckCircle size={17} className="shrink-0" style={{ color: "#4ADE80" }} />
              )}
              {revealed && isSelected && !isCorrect && (
                <XCircle size={17} className="shrink-0" style={{ color: "#F87171" }} />
              )}
            </button>
          )
        })}
      </div>

      {selected !== null && q.explication && (
        <div
          className="p-4 rounded-xl mb-6"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <p className="text-[11px] font-semibold mb-1.5 tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>
            EXPLANATION
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
            {q.explication}
          </p>
        </div>
      )}

      {selected !== null && (
        <button
          onClick={handleNext}
          className="group w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white transition-all duration-200 bg-[#7C5CFF] hover:bg-[#8B6BFF] hover:shadow-[0_0_24px_rgba(124,92,255,0.35)]"
        >
          {current + 1 >= total ? "See results" : "Next question"}
          <span className="hidden sm:inline text-xs font-normal text-white/60">(Enter)</span>
          <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}
    </div>
  )
}
