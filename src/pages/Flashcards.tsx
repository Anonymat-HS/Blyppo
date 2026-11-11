import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, RotateCcw, BookOpen, Loader2, CheckCircle } from "lucide-react"
import { useAuth } from "@/lib/supabase/auth"
import {
  fetchCourses,
  fetchFlashcardCountsByCourses,
  fetchCardsForCourse,
  fetchProgressForCards,
  recordFlashcardRating,
} from "@/lib/api"
import { formatInterval, nextIntervalDays, type FlashcardRating } from "@/lib/utils/srs"
import ErrorState from "@/components/ui/ErrorState"
import SaveWarning from "@/components/ui/SaveWarning"
import type { CourseSummary, FlashcardReviewCard } from "@/lib/types"

interface CourseWithCount extends CourseSummary {
  flashcard_count: number
}

const ratings: {
  r: FlashcardRating
  label: string
  color: string
  bg: string
  border: string
}[] = [
  { r: "again", label: "Again", color: "#F87171", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.22)" },
  { r: "hard", label: "Hard", color: "#FCD34D", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.22)" },
  { r: "good", label: "Good", color: "#4ADE80", bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.22)" },
  { r: "easy", label: "Easy", color: "#00D9FF", bg: "rgba(0,217,255,0.08)", border: "rgba(0,217,255,0.2)" },
]

export default function Flashcards({
  onBack,
  initialCourseId,
}: {
  onBack: () => void
  /** Course to review right away (opened from a Dashboard card) */
  initialCourseId?: string
}) {
  const { user } = useAuth()
  const [courses, setCourses] = useState<CourseWithCount[]>([])
  const [selectedCourse, setSelectedCourse] = useState<CourseWithCount | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingCards, setLoadingCards] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveFailed, setSaveFailed] = useState(false)

  // Every card of the course, and the cards of the current session
  // (a card rated "Again" comes back at the end of the session)
  const [allCards, setAllCards] = useState<FlashcardReviewCard[]>([])
  const [cards, setCards] = useState<FlashcardReviewCard[]>([])
  // Interval of each card (in days) when the session started
  const [intervals, setIntervals] = useState<Record<string, number>>({})
  const [nextDue, setNextDue] = useState<Date | null>(null)

  const [current, setCurrent] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [done, setDone] = useState(false)
  const [history, setHistory] = useState<FlashcardRating[]>([])

  const loadCourses = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const coursesData = await fetchCourses()
      const counts = await fetchFlashcardCountsByCourses(coursesData.map((c) => c.id))
      const withCounts = coursesData.map((c) => ({ ...c, flashcard_count: counts[c.id] ?? 0 }))
      setCourses(withCounts)

      const initial = withCounts.find((c) => c.id === initialCourseId)
      if (initial) await startReview(initial)
    } catch (err) {
      setLoadError((err as Error).message)
    } finally {
      setLoading(false)
    }
    // startReview only uses state setters and the signed-in user
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCourseId, user?.id])

  useEffect(() => {
    loadCourses()
  }, [loadCourses])

  /** Starts a session with the cards that are due, or with every card when `includeAll` is set. */
  async function startReview(course: CourseWithCount, includeAll = false) {
    setSelectedCourse(course)
    setLoadingCards(true)
    setLoadError(null)
    setSaveFailed(false)

    try {
      const data = await fetchCardsForCourse(course.id)
      const progress = user
        ? await fetchProgressForCards(user.id, data.map((c) => c.id))
        : {}

      const now = Date.now()
      const dueTime = (c: FlashcardReviewCard) => {
        const next = progress[c.id]?.next_review
        return next ? new Date(next).getTime() : null
      }
      // Overdue cards first (most overdue at the top), then cards never reviewed
      const overdue = data
        .filter((c) => dueTime(c) !== null && dueTime(c)! <= now)
        .sort((a, b) => dueTime(a)! - dueTime(b)!)
      const fresh = data.filter((c) => dueTime(c) === null)
      const upcoming = data.map(dueTime).filter((t): t is number => t !== null && t > now)

      const savedIntervals: Record<string, number> = {}
      for (const c of data) savedIntervals[c.id] = progress[c.id]?.intervalle_jours ?? 0

      setAllCards(data)
      setCards(includeAll ? data : [...overdue, ...fresh])
      setIntervals(savedIntervals)
      setNextDue(upcoming.length ? new Date(Math.min(...upcoming)) : null)
    } catch (err) {
      setSelectedCourse(null)
      setLoadError((err as Error).message)
    } finally {
      setLoadingCards(false)
    }
    setCurrent(0)
    setFlipped(false)
    setDone(false)
    setHistory([])
  }

  const card = cards[current]
  const total = cards.length

  const handleRate = (r: FlashcardRating) => {
    if (!card) return
    setHistory((h) => [...h, r])

    if (user) {
      recordFlashcardRating(user.id, card.id, r, intervals[card.id] ?? 0).catch(() =>
        setSaveFailed(true)
      )
    }

    // A forgotten card is asked again before the session ends
    const sessionLength = r === "again" ? total + 1 : total
    if (r === "again") setCards((c) => [...c, card])

    if (current + 1 >= sessionLength) {
      setDone(true)
    } else {
      setCurrent((c) => c + 1)
      setFlipped(false)
    }
  }

  const handlePrevious = () => {
    // Undo the "ask again" copy added by the rating being cancelled
    if (history[history.length - 1] === "again") setCards((c) => c.slice(0, -1))
    setHistory((h) => h.slice(0, -1))
    setCurrent((c) => c - 1)
    setFlipped(false)
  }

  // Keyboard: Space or Enter flips the card, 1-4 rates it once the answer is shown
  const inReview = Boolean(selectedCourse) && !loadingCards && !done && Boolean(card)
  useEffect(() => {
    if (!inReview) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === " " || e.key === "Enter") {
        // Let the focused control (e.g. a rating button) handle its own Enter/Space
        if ((e.target as HTMLElement).closest("button, a, input, select")) return
        e.preventDefault()
        setFlipped((f) => !f)
      } else if (flipped && "1234".includes(e.key) && e.key.length === 1) {
        handleRate(ratings[Number(e.key) - 1].r)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  })

  if (loadError) {
    return <ErrorState message={loadError} onRetry={loadCourses} />
  }

  // Loading
  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-lg mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 size={24} className="animate-spin mx-auto mb-3" style={{ color: "#7C5CFF" }} />
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Loading courses...</p>
        </div>
      </div>
    )
  }

  // No courses
  if (courses.length === 0) {
    return (
      <div className="p-6 md:p-8 max-w-lg mx-auto">
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
            Upload a course first, then generate flashcards from it.
          </p>
        </div>
      </div>
    )
  }

  // Course selection
  if (!selectedCourse) {
    return (
      <div className="p-6 md:p-8 max-w-lg mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm mb-6 transition-colors duration-150 text-[rgba(255,255,255,0.38)] hover:text-[rgba(255,255,255,0.8)]"
        >
          <ChevronLeft size={15} />
          Back
        </button>

        <h1 className="text-xl font-bold text-white mb-1">Select a course</h1>
        <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.38)" }}>
          Choose which flashcards to review
        </p>

        <div className="space-y-3">
          {courses.map((course) => (
            <button
              key={course.id}
              onClick={() => startReview(course)}
              className="w-full p-4 rounded-xl text-left transition-all duration-200 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(124,92,255,0.3)]"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-white">{course.titre}</span>
                <span
                  className="text-xs px-2 py-1 rounded-lg"
                  style={{
                    background: course.flashcard_count > 0 ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
                    color: course.flashcard_count > 0 ? "#4ADE80" : "#FCD34D",
                    border: `1px solid ${course.flashcard_count > 0 ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)"}`,
                  }}
                >
                  {course.flashcard_count} cards
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Loading cards
  if (loadingCards) {
    return (
      <div className="p-6 md:p-8 max-w-lg mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 size={24} className="animate-spin mx-auto mb-3" style={{ color: "#7C5CFF" }} />
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Loading flashcards...</p>
        </div>
      </div>
    )
  }

  // No cards
  if (allCards.length === 0) {
    return (
      <div className="p-6 md:p-8 max-w-lg mx-auto">
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
          <p className="font-bold text-sm text-white mb-1">No flashcards yet</p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.38)" }}>
            Generate flashcards from the Dashboard first.
          </p>
        </div>
      </div>
    )
  }

  // Nothing to review right now
  if (cards.length === 0) {
    return (
      <div className="p-6 md:p-8 max-w-lg mx-auto flex flex-col items-center text-center pt-16">
        <CheckCircle size={40} className="mb-4" style={{ color: "#4ADE80" }} />
        <h2 className="text-2xl font-black text-white mb-2">You're all caught up</h2>
        <p className="mb-8 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
          {nextDue
            ? `Next review: ${nextDue.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`
            : "No card is due for this course."}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => startReview(selectedCourse, true)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#7C5CFF] hover:bg-[#8B6BFF] transition-colors duration-200"
          >
            <RotateCcw size={14} />
            Review all {allCards.length} cards anyway
          </button>
          <button
            onClick={() => setSelectedCourse(null)}
            className="px-6 py-2.5 rounded-xl text-sm font-medium border border-white/[0.08] text-white/60 hover:bg-white/5 hover:text-white/90 transition-colors duration-200"
          >
            Choose another course
          </button>
        </div>
      </div>
    )
  }

  // Done
  if (done) {
    const counts = { again: 0, hard: 0, good: 0, easy: 0 } as Record<FlashcardRating, number>
    history.forEach((r) => counts[r]++)

    return (
      <div className="p-6 md:p-8 max-w-lg mx-auto flex flex-col items-center text-center pt-16">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-3xl font-black text-white mb-2">Deck complete!</h2>
        <p className="mb-8" style={{ color: "rgba(255,255,255,0.4)" }}>
          You reviewed {new Set(cards.map((c) => c.id)).size} cards
        </p>

        {saveFailed && <SaveWarning message="Some reviews could not be saved. Check your connection." />}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 w-full max-w-xs mb-10">
          {ratings.map(({ r, label, color, bg, border }) => (
            <div
              key={r}
              className="p-3 rounded-xl text-center"
              style={{ background: bg, border: `1px solid ${border}` }}
            >
              <p className="text-xl font-black" style={{ color }}>{counts[r]}</p>
              <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.38)" }}>{label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => startReview(selectedCourse, true)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 bg-[#7C5CFF] hover:bg-[#8B6BFF]"
          >
            <RotateCcw size={14} />
            Review again
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
    <div className="p-6 md:p-8 max-w-lg mx-auto">
      <button
        onClick={() => setSelectedCourse(null)}
        className="flex items-center gap-1.5 text-sm mb-6 transition-colors duration-150 text-[rgba(255,255,255,0.38)] hover:text-[rgba(255,255,255,0.8)]"
      >
        <ChevronLeft size={15} />
        Back
      </button>

      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[11px] font-semibold tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>
          {selectedCourse?.titre?.toUpperCase()} · FLASHCARDS
        </p>
        <span className="text-sm" style={{ color: "rgba(255,255,255,0.38)" }}>
          {current + 1} / {total}
        </span>
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

      {saveFailed && <SaveWarning message="Some reviews could not be saved. Check your connection." />}

      {/* Flashcard */}
      <div
        className="cursor-pointer mb-5 select-none w-full rounded-2xl p-8 sm:p-10 text-center transition-all duration-300"
        style={{
          background: flipped ? "rgba(124,92,255,0.06)" : "rgba(255,255,255,0.035)",
          border: `1px solid ${flipped ? "rgba(124,92,255,0.22)" : "rgba(255,255,255,0.09)"}`,
          minHeight: "270px",
        }}
        onClick={() => setFlipped((f) => !f)}
        role="button"
        tabIndex={0}
        aria-label={flipped ? "Show the question" : "Show the answer"}
      >
        {flipped ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-[11px] font-semibold tracking-widest mb-5" style={{ color: "rgba(167,139,250,0.6)" }}>
              ANSWER
            </p>
            <p className="text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.8)" }}>
              {card.verso}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-[11px] font-semibold tracking-widest mb-5" style={{ color: "rgba(255,255,255,0.28)" }}>
              QUESTION
            </p>
            <p className="text-xl md:text-2xl font-bold text-white leading-snug">
              {card.recto}
            </p>
            <p className="text-xs mt-8" style={{ color: "rgba(255,255,255,0.22)" }}>
              Tap to reveal answer
            </p>
          </div>
        )}
      </div>

      <p className="text-center text-xs mb-5" style={{ color: "rgba(255,255,255,0.28)" }}>
        {flipped ? "How well did you know this? (keys 1-4)" : "Tap the card or press Space to reveal the answer"}
      </p>

      {/* Rating buttons */}
      <div
        className="grid grid-cols-4 gap-2 transition-all duration-300"
        style={{ opacity: flipped ? 1 : 0, pointerEvents: flipped ? "auto" : "none" }}
      >
        {ratings.map(({ r, label, color, bg, border }) => (
          <button
            key={r}
            onClick={() => handleRate(r)}
            className="flex flex-col items-center gap-0.5 py-3 sm:py-4 rounded-xl transition-all duration-150 active:scale-95 min-h-[60px] hover:scale-[1.04]"
            style={{ background: bg, border: `1px solid ${border}` }}
          >
            <span className="text-sm font-bold" style={{ color }}>{label}</span>
            <span className="text-[11px]" style={{ color: color + "90" }}>
              {formatInterval(nextIntervalDays(r, intervals[card.id] ?? 0))}
            </span>
          </button>
        ))}
      </div>

      {!flipped && current > 0 && (
        <div className="flex justify-center mt-4">
          <button
            onClick={handlePrevious}
            className="flex items-center gap-1 text-xs transition-colors duration-150 text-[rgba(255,255,255,0.25)] hover:text-[rgba(255,255,255,0.6)]"
          >
            <ChevronLeft size={13} />
            Previous card
          </button>
        </div>
      )}
    </div>
  )
}
