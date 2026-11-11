import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, CheckCircle, XCircle, ArrowRight, RotateCcw, BookOpen, Brain, Target, Zap, Sparkles, Loader2, Flag } from "lucide-react"
import { useAuth } from "@/lib/supabase/auth"
import {
  fetchCourses,
  fetchQuizCountsByCourses,
  fetchQuestionsForCourse,
  fetchLastAnswers,
  recordQuizAnswer,
  recordQuizAttempt,
} from "@/lib/api"
import { findCorrectIndex, pickSession, prepareQuestions } from "@/lib/utils/quiz"
import { callGenerateFunction } from "@/lib/supabase/functions"
import ErrorState from "@/components/ui/ErrorState"
import SaveWarning from "@/components/ui/SaveWarning"
import { BackButton, EmptyState, LoadingState, primaryButton, secondaryButton } from "@/components/ui/PageStates"
import CoursePicker from "@/components/study/CoursePicker"
import ScoreRing from "@/components/study/ScoreRing"
import Confetti from "@/components/study/Confetti"
import FeedbackDialog, { type FeedbackTarget } from "@/components/ui/FeedbackDialog"
import QuizLengthPicker from "@/components/study/QuizLengthPicker"
import { useQuizLength } from "@/hooks/useQuizLength"
import type { CourseSummary, QuizQuestion } from "@/lib/types"

interface CourseWithCount extends CourseSummary {
  quiz_count: number
}

const SAVE_WARNING = "Your progress could not be saved. Check your connection."

/** Answer letters, each with its game-show color */
const LETTERS = [
  { key: "A", color: "#A78BFA" },
  { key: "B", color: "#22D3EE" },
  { key: "C", color: "#FFC83D" },
  { key: "D", color: "#F472B6" },
]

export default function Quiz({
  onBack,
  initialCourseId,
}: {
  onBack: () => void
  /** Course to start right away (opened from a Dashboard card) */
  initialCourseId?: string
}) {
  const { user } = useAuth()
  const [quizLength, setQuizLength] = useQuizLength()
  const [courses, setCourses] = useState<CourseWithCount[]>([])
  const [selectedCourse, setSelectedCourse] = useState<CourseWithCount | null>(null)
  // Every question of the course, and the ones of the current session
  const [pool, setPool] = useState<QuizQuestion[]>([])
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  // Latest answer to each question (absent = never answered), to pick what to ask next
  const [lastCorrect, setLastCorrect] = useState<Record<string, boolean>>({})
  // "New questions": generation in progress, its error, and how many were added
  const [generating, setGenerating] = useState(false)
  const [generateMsg, setGenerateMsg] = useState<string | null>(null)
  const [moreError, setMoreError] = useState<string | null>(null)
  const [added, setAdded] = useState<number | null>(null)
  const [reporting, setReporting] = useState<FeedbackTarget | null>(null)
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
    // startQuiz only uses state setters and the signed-in user
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCourseId, user?.id])

  useEffect(() => {
    loadCourses()
  }, [loadCourses])

  /** Starts a session with the given questions (options reshuffled). */
  function beginSession(list: QuizQuestion[]) {
    setQuestions(prepareQuestions(list))
    setCurrent(0)
    setScore(0)
    setFinished(false)
    setSelected(null)
    setAnswers([])
    setSaveFailed(false)
  }

  /** Every question of a course with the user's latest answers. */
  async function loadPool(courseId: string) {
    const all = prepareQuestions(await fetchQuestionsForCourse(courseId))
    const last = user ? await fetchLastAnswers(user.id, all.map((x) => x.id)) : {}
    setPool(all)
    setLastCorrect(last)
    return { all, last }
  }

  async function startQuiz(course: CourseWithCount) {
    setSelectedCourse(course)
    setLoadingQuiz(true)
    setLoadError(null)
    setMoreError(null)
    setAdded(null)

    try {
      const { all, last } = await loadPool(course.id)
      beginSession(pickSession(all, last, quizLength))
    } catch (err) {
      setSelectedCourse(null)
      setLoadError((err as Error).message)
    } finally {
      setLoadingQuiz(false)
    }
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
    setLastCorrect((last) => ({ ...last, [q.id]: isCorrect }))

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

  /** A new session: never-played questions first, then the missed ones. */
  const playAgain = () => {
    setAdded(null)
    beginSession(pickSession(pool, lastCorrect, quizLength))
  }

  /** Asks Kwizo for a new set of questions, then plays them. */
  const generateMore = async () => {
    if (!selectedCourse) return
    setGenerating(true)
    setMoreError(null)
    try {
      await callGenerateFunction(
        "generate-quiz",
        selectedCourse.id,
        "numberOfQuestions",
        10,
        setGenerateMsg,
        { more: true }
      )
      const before = new Set(pool.map((x) => x.id))
      const { all, last } = await loadPool(selectedCourse.id)
      const fresh = all.filter((x) => !before.has(x.id))
      setAdded(fresh.length)
      setCourses((list) =>
        list.map((c) => (c.id === selectedCourse.id ? { ...c, quiz_count: all.length } : c))
      )
      beginSession(fresh.length ? pickSession(fresh, {}, quizLength) : pickSession(all, last, quizLength))
    } catch (err) {
      setMoreError((err as Error).message)
    } finally {
      setGenerating(false)
      setGenerateMsg(null)
    }
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

  if (loading) {
    return <LoadingState label="Loading courses..." />
  }

  if (courses.length === 0) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto">
        <BackButton onClick={onBack} />
        <EmptyState
          icon={BookOpen}
          title="No courses yet"
          text="Upload a course first, then Kwizo writes a quiz from it."
        />
      </div>
    )
  }

  if (!selectedCourse) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto">
        <BackButton onClick={onBack} />
        <CoursePicker
          title="Pick a quiz"
          subtitle="Which course do you want to be quizzed on?"
          icon={Brain}
          courses={courses}
          count={(c) => c.quiz_count}
          unit="question"
          onPick={startQuiz}
        >
          <QuizLengthPicker value={quizLength} onChange={setQuizLength} />
        </CoursePicker>
      </div>
    )
  }

  if (loadingQuiz) {
    return <LoadingState label="Getting your quiz ready..." />
  }

  if (questions.length === 0) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto">
        <BackButton onClick={() => setSelectedCourse(null)} label="Back to courses" />
        <EmptyState
          icon={BookOpen}
          tone="spark"
          title="No quiz questions yet"
          text="Generate the quiz for this course from the Dashboard first."
        />
      </div>
    )
  }

  if (finished) {
    const pct = Math.round((score / total) * 100)
    const unseen = pool.filter((x) => !(x.id in lastCorrect)).length
    const mistakes = questions
      .map((question, i) => ({ question, picked: question.options[answers[i]] }))
      .filter(({ question, picked }) => picked !== undefined && picked !== question.bonne_reponse)
    const grade =
      pct >= 80
        ? { label: "Brilliant!", emoji: "🏆", color: "#4ADE80", line: "You know this course." }
        : pct >= 60
          ? { label: "Nice work!", emoji: "💪", color: "#FFC83D", line: "A few more rounds and it's yours." }
          : { label: "Keep going!", emoji: "🌱", color: "#F87171", line: "Every miss is something you'll remember next time." }

    return (
      <div className="relative p-6 md:p-8 max-w-2xl mx-auto flex flex-col items-center text-center pt-10 sm:pt-14">
        {pct >= 80 && <Confetti />}

        <div className="animate-pop mb-5">
          <ScoreRing pct={pct} color={grade.color} />
        </div>
        <h2 className="text-3xl font-black text-white mb-1">
          {grade.label} <span aria-hidden="true">{grade.emoji}</span>
        </h2>
        <p className="text-white/45 mb-1">{grade.line}</p>
        <p className="text-sm text-white/30 mb-8">{selectedCourse.titre}</p>

        {saveFailed && <SaveWarning message={SAVE_WARNING} />}

        <div className="grid grid-cols-2 gap-3 w-full max-w-xs mb-10">
          <div className="p-3.5 rounded-2xl bg-ok/10 border border-ok/20">
            <p className="text-2xl font-black text-ok">{score}</p>
            <p className="text-xs text-white/40">Correct</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-ko/10 border border-ko/20">
            <p className="text-2xl font-black text-ko">{total - score}</p>
            <p className="text-xs text-white/40">Missed</p>
          </div>
        </div>

        <div className="mb-4">
          <QuizLengthPicker value={quizLength} onChange={setQuizLength} disabled={generating} />
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 mb-6">
          <button onClick={playAgain} className={primaryButton} disabled={generating}>
            <RotateCcw size={15} />
            {unseen > 0 ? `Play again · ${Math.min(unseen, quizLength)} new` : "Play again"}
          </button>
          {mistakes.length > 0 && (
            <button
              onClick={() => beginSession(mistakes.map((m) => m.question))}
              className={secondaryButton}
              disabled={generating}
            >
              <Target size={15} />
              Retry my {mistakes.length} miss{mistakes.length !== 1 ? "es" : ""}
            </button>
          )}
          <button onClick={() => setSelectedCourse(null)} className={secondaryButton} disabled={generating}>
            Choose another course
          </button>
        </div>

        {/* New questions */}
        <div className="w-full mb-10 p-5 rounded-2xl text-left border border-spark/25 bg-spark/[0.06]">
          <div className="flex items-start gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-spark/15 text-spark">
              <Sparkles size={18} />
            </div>
            <div className="flex-1 min-w-[12rem]">
              <p className="font-bold text-white text-sm">
                {unseen > 0 ? "Want even more questions?" : "You have played every question"}
              </p>
              <p className="text-xs text-white/50 mt-0.5">
                {pool.length} question{pool.length !== 1 ? "s" : ""} in this course
                {unseen > 0 ? ` · ${unseen} not played yet` : ""}. Kwizo can write 10 new ones, different
                from the ones you already have.
              </p>
            </div>
            <button
              onClick={generateMore}
              disabled={generating}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all bg-spark text-[#16161D] hover:bg-spark-soft disabled:opacity-60"
            >
              {generating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {generating ? "Writing new questions..." : "New questions"}
            </button>
          </div>
          {generating && (
            <p className="text-xs text-white/40 mt-3" role="status">
              {generateMsg ?? "This takes about 10 to 20 seconds."}
            </p>
          )}
          {moreError && (
            <p className="text-xs text-[#FCA5A5] mt-3" role="alert">
              {moreError}
            </p>
          )}
        </div>

        {mistakes.length > 0 && (
          <div className="w-full text-left">
            <h3 className="flex items-center gap-2 text-sm font-bold text-white mb-3">
              <Target size={15} className="text-spark" />
              Learn from your misses ({mistakes.length})
            </h3>
            <div className="space-y-3">
              {mistakes.map(({ question, picked }, i) => (
                <div
                  key={question.id}
                  style={{ animationDelay: `${i * 60}ms` }}
                  className="animate-rise p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <p className="text-sm font-semibold text-white">{question.question}</p>
                    <button
                      onClick={() => setReporting({ kind: "question", id: question.id, text: question.question })}
                      aria-label="Report this question"
                      title="Report this question"
                      className="shrink-0 p-1 rounded-lg text-white/30 hover:text-white/80 hover:bg-white/5 transition-colors"
                    >
                      <Flag size={13} />
                    </button>
                  </div>
                  <p className="flex items-start gap-2 text-xs mb-1.5 text-[#FCA5A5]">
                    <XCircle size={14} className="shrink-0 mt-px" />
                    {picked}
                  </p>
                  <p className="flex items-start gap-2 text-xs text-[#86EFAC]">
                    <CheckCircle size={14} className="shrink-0 mt-px" />
                    {question.bonne_reponse}
                  </p>
                  {question.explication && (
                    <p className="text-xs mt-3 pt-3 leading-relaxed text-white/50 border-t border-white/[0.06]">
                      {question.explication}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {reporting && <FeedbackDialog target={reporting} onClose={() => setReporting(null)} />}
      </div>
    )
  }

  const revealed = selected !== null
  const gotIt = revealed && selected === correctIndex

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-5">
        <button
          onClick={() => setSelectedCourse(null)}
          className="inline-flex items-center gap-1.5 text-sm transition-colors duration-150 text-white/40 hover:text-white/85"
        >
          <ChevronLeft size={15} />
          Exit
        </button>
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold bg-spark/10 border border-spark/25 text-spark"
          aria-label={`Score: ${score}`}
        >
          <Zap size={14} />
          {score}
        </div>
      </div>

      <p className="text-[11px] font-semibold tracking-wider text-white/30 truncate">
        {selectedCourse.titre.toUpperCase()}
      </p>
      <p className="text-sm text-white/55 mb-3">
        Question <span className="font-bold text-white">{current + 1}</span> of {total}
      </p>

      {/* One segment per question: green when right, red when missed */}
      <div className="flex gap-1 mb-8" aria-hidden="true">
        {questions.map((question, i) => {
          const picked = answers[i]
          const state =
            picked === undefined
              ? i === current
                ? "bg-brand/60"
                : "bg-white/[0.08]"
              : picked === findCorrectIndex(question)
                ? "bg-ok"
                : "bg-ko"
          return <div key={question.id} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${state}`} />
        })}
      </div>

      {saveFailed && <SaveWarning message={SAVE_WARNING} />}

      {added !== null && current === 0 && selected === null && (
        <div className="animate-rise mb-5 px-4 py-3 rounded-xl text-sm flex items-center gap-2 bg-spark/10 border border-spark/25 text-spark" role="status">
          <Sparkles size={15} className="shrink-0" />
          {added > 0
            ? `${added} new question${added !== 1 ? "s" : ""} added. Here they are!`
            : "No new question this time: here is a fresh mix instead."}
        </div>
      )}

      <h2 key={q.id} className="animate-rise text-xl md:text-2xl font-bold leading-snug text-white mb-7">
        {q.question}
      </h2>

      <div className="space-y-3 mb-6">
        {q.options.map((opt, idx) => {
          const isSelected = selected === idx
          const isCorrect = idx === correctIndex
          const letter = LETTERS[idx] ?? LETTERS[0]

          let tile = "bg-white/[0.03] border-white/[0.09] text-white/80 enabled:hover:bg-white/[0.06] enabled:hover:border-white/20 enabled:hover:-translate-y-0.5"
          let badge: React.CSSProperties = { background: letter.color + "22", color: letter.color, borderColor: letter.color + "55" }
          if (revealed) {
            if (isCorrect) {
              tile = `bg-ok/10 border-ok/45 text-[#BBF7D0] ${isSelected ? "animate-pop" : ""}`
              badge = { background: "#22C55E", color: "#fff", borderColor: "#22C55E" }
            } else if (isSelected) {
              tile = "bg-ko/10 border-ko/45 text-[#FECACA] animate-shake"
              badge = { background: "#EF4444", color: "#fff", borderColor: "#EF4444" }
            } else {
              tile = "bg-transparent border-white/[0.05] text-white/30"
              badge = { color: "rgba(255,255,255,0.3)", borderColor: "rgba(255,255,255,0.1)" }
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              disabled={revealed}
              className={`w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border-2 text-left transition-all duration-200 ${tile}`}
            >
              <span
                className="w-9 h-9 rounded-xl border text-sm font-black flex items-center justify-center shrink-0 transition-colors"
                style={badge}
              >
                {letter.key}
              </span>
              <span className="font-medium flex-1">{opt}</span>
              {revealed && isCorrect && <CheckCircle size={19} className="shrink-0 text-ok" />}
              {revealed && isSelected && !isCorrect && <XCircle size={19} className="shrink-0 text-ko" />}
            </button>
          )
        })}
      </div>

      {revealed && (
        <div
          className={`animate-rise p-4 rounded-2xl mb-5 border ${gotIt ? "bg-ok/[0.07] border-ok/25" : "bg-ko/[0.07] border-ko/25"}`}
          role="status"
        >
          <div className="flex items-start justify-between gap-3">
            <p className={`text-sm font-bold mb-1 ${gotIt ? "text-ok" : "text-ko"}`}>
              {gotIt ? "Correct! +1" : `Not quite. The answer is ${LETTERS[correctIndex]?.key ?? "?"}.`}
            </p>
            <button
              onClick={() => setReporting({ kind: "question", id: q.id, text: q.question })}
              className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-white/35 hover:text-white/80 transition-colors"
            >
              <Flag size={12} />
              Report
            </button>
          </div>
          {q.explication && <p className="text-sm leading-relaxed text-white/65">{q.explication}</p>}
        </div>
      )}

      {revealed ? (
        <button onClick={handleNext} className={`group w-full ${primaryButton} py-3.5`}>
          {current + 1 >= total ? "See my score" : "Next question"}
          <span className="hidden sm:inline text-xs font-normal text-white/60">(Enter)</span>
          <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      ) : (
        <p className="hidden sm:block text-center text-xs text-white/25">
          Press 1-4 or A-D to answer
        </p>
      )}
      {reporting && <FeedbackDialog target={reporting} onClose={() => setReporting(null)} />}
    </div>
  )
}
