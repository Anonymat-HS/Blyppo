import { useState, useEffect, useCallback } from "react"
import {
  ChevronLeft, CheckCircle, XCircle, ArrowRight, RotateCcw, BookOpen, Brain, Target, Zap,
  Sparkles, Loader2, Flag, Layers3, Check,
} from "lucide-react"
import { useAuth } from "@/lib/supabase/auth"
import {
  fetchCourses,
  fetchQuizCountsByCourses,
  fetchQuestionsForCourses,
  fetchLastAnswers,
  recordQuizAnswer,
  recordQuizAttempt,
} from "@/lib/api"
import { grade, pickSession, prepareQuestions, typeOf, type QuizResponse } from "@/lib/utils/quiz"
import { callGenerateFunction } from "@/lib/supabase/functions"
import ErrorState from "@/components/ui/ErrorState"
import SaveWarning from "@/components/ui/SaveWarning"
import { BackButton, EmptyState, LoadingState, primaryButton, secondaryButton } from "@/components/ui/PageStates"
import CoursePicker from "@/components/study/CoursePicker"
import CourseBadge from "@/components/study/CourseBadge"
import ScoreRing from "@/components/study/ScoreRing"
import Confetti from "@/components/study/Confetti"
import FeedbackDialog, { type FeedbackTarget } from "@/components/ui/FeedbackDialog"
import QuizLengthPicker from "@/components/study/QuizLengthPicker"
import { AnswerArea, LETTERS, PassageCard, TypeBadge, describeAnswer, describeResponse } from "@/components/study/answers"
import { useQuizLength } from "@/hooks/useQuizLength"
import { useT } from "@/lib/i18n"
import type { CourseSummary, QuizQuestion } from "@/lib/types"

interface CourseWithCount extends CourseSummary {
  quiz_count: number
}

/** What the student answered to one question of the session, and whether it was right. */
interface Answered {
  response: QuizResponse
  correct: boolean
}

const SAVE_WARNING = "Your progress could not be saved. Check your connection."
/** Id of the pseudo-course of a quiz mixing several courses */
const MIXED = "__mixed__"

export default function Quiz({
  onBack,
  initialCourseId,
}: {
  onBack: () => void
  /** Course to start right away (opened from a Dashboard card) */
  initialCourseId?: string
}) {
  const { user } = useAuth()
  const { t } = useT()
  const [quizLength, setQuizLength] = useQuizLength()
  const [courses, setCourses] = useState<CourseWithCount[]>([])
  const [selectedCourse, setSelectedCourse] = useState<CourseWithCount | null>(null)
  // Courses of the current quiz: one, or several for a mixed quiz
  const [courseIds, setCourseIds] = useState<string[]>([])
  // Mixed quiz: the picker is in "tick several courses" mode, and the ticked ones
  const [mixing, setMixing] = useState(false)
  const [ticked, setTicked] = useState<string[]>([])
  // Every question of the course(s), and the ones of the current session
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
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveFailed, setSaveFailed] = useState(false)
  // One entry per answered question of the session, in order
  const [answered, setAnswered] = useState<Answered[]>([])

  const loadCourses = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const coursesData = await fetchCourses()
      const counts = await fetchQuizCountsByCourses(coursesData.map((c) => c.id))
      const withCounts = coursesData.map((c) => ({ ...c, quiz_count: counts[c.id] ?? 0 }))
      setCourses(withCounts)

      const initial = withCounts.find((c) => c.id === initialCourseId)
      if (initial) await startQuiz([initial])
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
    setAnswered([])
    setSaveFailed(false)
  }

  /** Every question of the course(s) with the user's latest answers. */
  async function loadPool(ids: string[]) {
    const all = prepareQuestions(await fetchQuestionsForCourses(ids))
    const last = user ? await fetchLastAnswers(user.id, all.map((x) => x.id)) : {}
    setPool(all)
    setLastCorrect(last)
    return { all, last }
  }

  /** One course, or several for a mixed quiz. */
  async function startQuiz(picked: CourseWithCount[]) {
    const mixed = picked.length > 1
    setSelectedCourse(
      mixed
        ? {
            id: MIXED,
            titre: t("{n} courses mixed", { n: picked.length }),
            created_at: "",
            quiz_count: picked.reduce((sum, c) => sum + c.quiz_count, 0),
          }
        : picked[0]
    )
    setCourseIds(picked.map((c) => c.id))
    setLoadingQuiz(true)
    setLoadError(null)
    setMoreError(null)
    setAdded(null)

    try {
      const { all, last } = await loadPool(picked.map((c) => c.id))
      beginSession(pickSession(all, last, quizLength))
    } catch (err) {
      setSelectedCourse(null)
      setLoadError((err as Error).message)
    } finally {
      setLoadingQuiz(false)
    }
  }

  const isMixed = selectedCourse?.id === MIXED
  const q = questions[current]
  const total = questions.length
  const result = answered[current]?.response ?? null
  const courseTitle = (id?: string) => courses.find((c) => c.id === id)?.titre ?? ""

  const handleSubmit = (response: QuizResponse) => {
    if (!q || answered[current]) return
    const correct = grade(q, response)
    setAnswered((list) => [...list, { response, correct }])
    if (correct) setScore((s) => s + 1)
    setLastCorrect((last) => ({ ...last, [q.id]: correct }))

    if (!user) return
    recordQuizAnswer(user.id, q.id, correct).catch(() => setSaveFailed(true))
  }

  const handleNext = () => {
    if (current + 1 >= total) {
      setFinished(true)
      if (!user) return
      // One attempt per course, so each course's history stays right in a mixed quiz
      const byCourse = new Map<string, { score: number; total: number }>()
      questions.forEach((question, i) => {
        const id = question.course_id ?? courseIds[0]
        const entry = byCourse.get(id) ?? { score: 0, total: 0 }
        entry.total++
        if (answered[i]?.correct) entry.score++
        byCourse.set(id, entry)
      })
      for (const [id, attempt] of byCourse) {
        recordQuizAttempt(user.id, id, attempt.score, attempt.total).catch(() => setSaveFailed(true))
      }
    } else {
      setCurrent((c) => c + 1)
    }
  }

  /** A new session: never-played questions first, then the missed ones. */
  const playAgain = () => {
    setAdded(null)
    beginSession(pickSession(pool, lastCorrect, quizLength))
  }

  /** Asks Kwizo for a new set of questions, then plays them (one course only). */
  const generateMore = async () => {
    if (!selectedCourse || isMixed) return
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
      const { all, last } = await loadPool([selectedCourse.id])
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

  // Keyboard: Enter or Space for the next question once answered.
  // Answering keys are handled by each answer component.
  const inQuiz = Boolean(selectedCourse) && !loadingQuiz && !finished && questions.length > 0
  useEffect(() => {
    if (!inQuiz || !result) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key !== "Enter" && e.key !== " ") return
      // Let the focused control handle its own Enter/Space
      if ((e.target as HTMLElement).closest("button, a, input, select, textarea")) return
      e.preventDefault()
      handleNext()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  })

  if (loadError) {
    return <ErrorState message={loadError} onRetry={loadCourses} />
  }

  if (loading) {
    return <LoadingState label={t("Loading courses...")} />
  }

  if (courses.length === 0) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto">
        <BackButton onClick={onBack} />
        <EmptyState
          icon={BookOpen}
          title={t("No courses yet")}
          text={t("Upload a course first, then Kwizo writes a quiz from it.")}
        />
      </div>
    )
  }

  if (!selectedCourse) {
    const playable = courses.filter((c) => c.quiz_count > 0)
    const tickedCourses = playable.filter((c) => ticked.includes(c.id))
    const tickedQuestions = tickedCourses.reduce((sum, c) => sum + c.quiz_count, 0)

    if (mixing) {
      return (
        <div className="p-6 md:p-8 max-w-2xl mx-auto">
          <BackButton onClick={() => setMixing(false)} label={t("Back")} />
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-spark/15 border border-spark/25 text-spark">
              <Layers3 size={20} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">{t("Mix several courses")}</h1>
              <p className="text-sm text-white/40">{t("One quiz with questions from every course you tick.")}</p>
            </div>
          </div>
          <div className="mb-5">
            <QuizLengthPicker value={quizLength} onChange={setQuizLength} />
          </div>
          <div className="space-y-2.5 mb-6">
            {playable.map((course) => {
              const on = ticked.includes(course.id)
              return (
                <button
                  key={course.id}
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => setTicked((list) => (on ? list.filter((id) => id !== course.id) : [...list, course.id]))}
                  className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl text-left border-2 transition-colors ${
                    on ? "bg-brand/10 border-brand/50" : "bg-white/[0.03] border-white/[0.07] hover:border-white/20"
                  }`}
                >
                  <CourseBadge id={course.id} title={course.titre} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-white truncate">{course.titre}</p>
                    <p className="text-xs text-white/40">
                      {course.quiz_count === 1
                        ? t("{n} question", { n: course.quiz_count })
                        : t("{n} questions", { n: course.quiz_count })}
                    </p>
                  </div>
                  <span
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 ${
                      on ? "bg-brand border-brand text-white" : "border-white/20"
                    }`}
                  >
                    {on && <Check size={14} strokeWidth={3} />}
                  </span>
                </button>
              )
            })}
          </div>
          <button
            onClick={() => startQuiz(tickedCourses)}
            disabled={tickedCourses.length < 2}
            className={`w-full ${primaryButton} py-3.5`}
          >
            <Layers3 size={16} />
            {tickedCourses.length < 2
              ? t("Tick at least 2 courses")
              : t("Start the mixed quiz · {n} questions available", { n: tickedQuestions })}
          </button>
        </div>
      )
    }

    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto">
        <BackButton onClick={onBack} />
        <CoursePicker
          title={t("Pick a quiz")}
          subtitle={t("Which course do you want to be quizzed on?")}
          icon={Brain}
          courses={courses}
          count={(c) => c.quiz_count}
          countLabel={(n) => (n === 1 ? t("{n} question", { n }) : t("{n} questions", { n }))}
          emptyLabel={t("No questions yet")}
          onPick={(course) => startQuiz([course])}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <QuizLengthPicker value={quizLength} onChange={setQuizLength} />
            {playable.length >= 2 && (
              <button
                onClick={() => {
                  setTicked([])
                  setMixing(true)
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold border border-spark/30 bg-spark/10 text-spark hover:bg-spark/20 transition-colors"
              >
                <Layers3 size={15} />
                {t("Mix several courses")}
              </button>
            )}
          </div>
        </CoursePicker>
      </div>
    )
  }

  if (loadingQuiz) {
    return <LoadingState label={t("Getting your quiz ready...")} />
  }

  if (questions.length === 0) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto">
        <BackButton onClick={() => setSelectedCourse(null)} label={t("Back to courses")} />
        <EmptyState
          icon={BookOpen}
          tone="spark"
          title={t("No quiz questions yet")}
          text={t("Generate the quiz for this course from the Dashboard first.")}
        />
      </div>
    )
  }

  if (finished) {
    const pct = Math.round((score / total) * 100)
    const unseen = pool.filter((x) => !(x.id in lastCorrect)).length
    const mistakes = questions
      .map((question, i) => ({ question, entry: answered[i] }))
      .filter(({ entry }) => entry && !entry.correct)
    const rating =
      pct >= 80
        ? { label: t("Brilliant!"), emoji: "🏆", color: "#4ADE80", line: t("You know this course.") }
        : pct >= 60
          ? { label: t("Nice work!"), emoji: "💪", color: "#FFC83D", line: t("A few more rounds and it's yours.") }
          : { label: t("Keep going!"), emoji: "🌱", color: "#F87171", line: t("Every miss is something you'll remember next time.") }

    return (
      <div className="relative p-6 md:p-8 max-w-2xl mx-auto flex flex-col items-center text-center pt-10 sm:pt-14">
        {pct >= 80 && <Confetti />}

        <div className="animate-pop mb-5">
          <ScoreRing pct={pct} color={rating.color} />
        </div>
        <h2 className="text-3xl font-black text-white mb-1">
          {rating.label} <span aria-hidden="true">{rating.emoji}</span>
        </h2>
        <p className="text-white/45 mb-1">{rating.line}</p>
        <p className="text-sm text-white/30 mb-8">{selectedCourse.titre}</p>

        {saveFailed && <SaveWarning message={t(SAVE_WARNING)} />}

        <div className="grid grid-cols-2 gap-3 w-full max-w-xs mb-10">
          <div className="p-3.5 rounded-2xl bg-ok/10 border border-ok/20">
            <p className="text-2xl font-black text-ok">{score}</p>
            <p className="text-xs text-white/40">{t("Correct")}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-ko/10 border border-ko/20">
            <p className="text-2xl font-black text-ko">{total - score}</p>
            <p className="text-xs text-white/40">{t("Missed")}</p>
          </div>
        </div>

        <div className="mb-4">
          <QuizLengthPicker value={quizLength} onChange={setQuizLength} disabled={generating} />
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 mb-6">
          <button onClick={playAgain} className={primaryButton} disabled={generating}>
            <RotateCcw size={15} />
            {unseen > 0 ? t("Play again · {n} new", { n: Math.min(unseen, quizLength) }) : t("Play again")}
          </button>
          {mistakes.length > 0 && (
            <button
              onClick={() => beginSession(mistakes.map((m) => m.question))}
              className={secondaryButton}
              disabled={generating}
            >
              <Target size={15} />
              {mistakes.length === 1
                ? t("Retry my {n} miss", { n: mistakes.length })
                : t("Retry my {n} misses", { n: mistakes.length })}
            </button>
          )}
          <button onClick={() => setSelectedCourse(null)} className={secondaryButton} disabled={generating}>
            {t("Choose another course")}
          </button>
        </div>

        {/* New questions: one course at a time */}
        {!isMixed && (
          <div className="w-full mb-10 p-5 rounded-2xl text-left border border-spark/25 bg-spark/[0.06]">
            <div className="flex items-start gap-3 flex-wrap">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-spark/15 text-spark">
                <Sparkles size={18} />
              </div>
              <div className="flex-1 min-w-[12rem]">
                <p className="font-bold text-white text-sm">
                  {unseen > 0 ? t("Want even more questions?") : t("You have played every question")}
                </p>
                <p className="text-xs text-white/50 mt-0.5">
                  {pool.length === 1
                    ? unseen > 0
                      ? t("{total} question in this course · {n} not played yet.", { total: pool.length, n: unseen })
                      : t("{n} question in this course.", { n: pool.length })
                    : unseen > 0
                      ? t("{total} questions in this course · {n} not played yet.", { total: pool.length, n: unseen })
                      : t("{n} questions in this course.", { n: pool.length })}{" "}
                  {t("Kwizo can write 10 new ones, different from the ones you already have.")}
                </p>
              </div>
              <button
                onClick={generateMore}
                disabled={generating}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all bg-spark text-[#16161D] hover:bg-spark-soft disabled:opacity-60"
              >
                {generating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {generating ? t("Writing new questions...") : t("New questions")}
              </button>
            </div>
            {generating && (
              <p className="text-xs text-white/40 mt-3" role="status">
                {generateMsg ?? t("This takes about 10 to 20 seconds.")}
              </p>
            )}
            {moreError && (
              <p className="text-xs text-[#FCA5A5] mt-3" role="alert">
                {moreError}
              </p>
            )}
          </div>
        )}

        {mistakes.length > 0 && (
          <div className="w-full text-left">
            <h3 className="flex items-center gap-2 text-sm font-bold text-white mb-3">
              <Target size={15} className="text-spark" />
              {t("Learn from your misses ({n})", { n: mistakes.length })}
            </h3>
            <div className="space-y-3">
              {mistakes.map(({ question, entry }, i) => (
                <div
                  key={question.id}
                  style={{ animationDelay: `${i * 60}ms` }}
                  className="animate-rise p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <TypeBadge q={question} />
                      <p className="text-sm font-semibold text-white">{question.question}</p>
                    </div>
                    <button
                      onClick={() => setReporting({ kind: "question", id: question.id, text: question.question })}
                      aria-label={t("Report this question")}
                      title={t("Report this question")}
                      className="shrink-0 p-1 rounded-lg text-white/30 hover:text-white/80 hover:bg-white/5 transition-colors"
                    >
                      <Flag size={13} />
                    </button>
                  </div>
                  <p className="flex items-start gap-2 text-xs mb-1.5 text-[#FCA5A5]">
                    <XCircle size={14} className="shrink-0 mt-px" />
                    {entry ? describeResponse(question, entry.response, t) : "—"}
                  </p>
                  <p className="flex items-start gap-2 text-xs text-[#86EFAC]">
                    <CheckCircle size={14} className="shrink-0 mt-px" />
                    {describeAnswer(question, t)}
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

  const revealed = result !== null
  const gotIt = answered[current]?.correct ?? false
  const type = typeOf(q)
  const rightLetter = type === "single" ? LETTERS[q.options.indexOf((q.answers ?? [])[0])]?.key : undefined
  // Same passage as the previous question: the text is already known, keep it shown but smaller
  const samePassage = Boolean(q.passage && questions[current - 1]?.passage?.id === q.passage.id)
  // The question number stays bold: split the sentence around its placeholder
  const [counterBefore, counterAfter = ""] = t("Question {current} of {total}", { total }).split("{current}")

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-5">
        <button
          onClick={() => setSelectedCourse(null)}
          className="inline-flex items-center gap-1.5 text-sm transition-colors duration-150 text-white/40 hover:text-white/85"
        >
          <ChevronLeft size={15} />
          {t("Exit")}
        </button>
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold bg-spark/10 border border-spark/25 text-spark"
          aria-label={t("Score: {n}", { n: score })}
        >
          <Zap size={14} />
          {score}
        </div>
      </div>

      <p className="text-[11px] font-semibold tracking-wider text-white/30 truncate">
        {(isMixed ? courseTitle(q.course_id) || selectedCourse.titre : selectedCourse.titre).toUpperCase()}
      </p>
      <p className="text-sm text-white/55 mb-3">
        {counterBefore}
        <span className="font-bold text-white">{current + 1}</span>
        {counterAfter}
      </p>

      {/* One segment per question: green when right, red when missed */}
      <div className="flex gap-1 mb-8" aria-hidden="true">
        {questions.map((question, i) => {
          const entry = answered[i]
          const state = !entry
            ? i === current
              ? "bg-brand/60"
              : "bg-white/[0.08]"
            : entry.correct
              ? "bg-ok"
              : "bg-ko"
          return <div key={question.id} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${state}`} />
        })}
      </div>

      {saveFailed && <SaveWarning message={t(SAVE_WARNING)} />}

      {added !== null && current === 0 && !revealed && (
        <div className="animate-rise mb-5 px-4 py-3 rounded-xl text-sm flex items-center gap-2 bg-spark/10 border border-spark/25 text-spark" role="status">
          <Sparkles size={15} className="shrink-0" />
          {added > 0
            ? added === 1
              ? t("{n} new question added. Here they are!", { n: added })
              : t("{n} new questions added. Here they are!", { n: added })
            : t("No new question this time: here is a fresh mix instead.")}
        </div>
      )}

      {q.passage && (
        <div className={samePassage ? "opacity-80" : "animate-rise"}>
          <PassageCard text={q.passage.text} />
        </div>
      )}

      <div key={q.id} className="animate-rise">
        <TypeBadge q={q} />
        <h2 className="text-xl md:text-2xl font-bold leading-snug text-white mb-6">
          {type === "cloze" ? t("Complete the sentence.") : q.question}
        </h2>
      </div>

      <AnswerArea q={q} result={result} onSubmit={handleSubmit} />

      {revealed && (
        <div
          className={`animate-rise p-4 rounded-2xl mb-5 border ${gotIt ? "bg-ok/[0.07] border-ok/25" : "bg-ko/[0.07] border-ko/25"}`}
          role="status"
        >
          <div className="flex items-start justify-between gap-3">
            <p className={`text-sm font-bold mb-1 ${gotIt ? "text-ok" : "text-ko"}`}>
              {gotIt
                ? t("Correct! +1")
                : rightLetter
                  ? t("Not quite. The answer is {letter}.", { letter: rightLetter })
                  : type === "multiple"
                    ? t("Not quite: you need every right answer, and only those.")
                    : t("Not quite.")}
            </p>
            <button
              onClick={() => setReporting({ kind: "question", id: q.id, text: q.question })}
              className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-white/35 hover:text-white/80 transition-colors"
            >
              <Flag size={12} />
              {t("Report")}
            </button>
          </div>
          {q.explication && <p className="text-sm leading-relaxed text-white/65">{q.explication}</p>}
        </div>
      )}

      {revealed && (
        <button onClick={handleNext} className={`group w-full ${primaryButton} py-3.5`}>
          {current + 1 >= total ? t("See my score") : t("Next question")}
          <span className="hidden sm:inline text-xs font-normal text-white/60">{t("(Enter)")}</span>
          <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}
      {!revealed && type === "single" && (
        <p className="hidden sm:block text-center text-xs text-white/25">{t("Press 1-4 or A-D to answer")}</p>
      )}
      {reporting && <FeedbackDialog target={reporting} onClose={() => setReporting(null)} />}
    </div>
  )
}
