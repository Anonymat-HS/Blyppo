import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, RotateCcw, BookOpen, CheckCircle, Layers, Sparkles, Loader2, Flag } from "lucide-react"
import { useAuth } from "@/lib/supabase/auth"
import {
  fetchCourses,
  fetchFlashcardCountsByCourses,
  fetchCardsForCourse,
  fetchProgressForCards,
  recordFlashcardRating,
} from "@/lib/api"
import { formatInterval, nextIntervalDays, type FlashcardRating } from "@/lib/utils/srs"
import { shuffled } from "@/lib/utils/quiz"
import { callGenerateFunction } from "@/lib/supabase/functions"
import ErrorState from "@/components/ui/ErrorState"
import SaveWarning from "@/components/ui/SaveWarning"
import { BackButton, EmptyState, LoadingState, primaryButton, secondaryButton } from "@/components/ui/PageStates"
import CoursePicker from "@/components/study/CoursePicker"
import Confetti from "@/components/study/Confetti"
import FeedbackDialog from "@/components/ui/FeedbackDialog"
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
  // "More cards": generation in progress and its error
  const [generating, setGenerating] = useState(false)
  const [generateMsg, setGenerateMsg] = useState<string | null>(null)
  const [moreError, setMoreError] = useState<string | null>(null)
  const [reporting, setReporting] = useState(false)

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
      setCourses((list) => list.map((c) => (c.id === course.id ? { ...c, flashcard_count: data.length } : c)))
      // A full review is shuffled, so it never plays in the same order twice
      setCards(includeAll ? shuffled(data) : [...overdue, ...fresh])
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

  /** Asks Kwizo for a new set of cards, then reviews the new ones (they are due). */
  const generateMore = async () => {
    if (!selectedCourse) return
    setGenerating(true)
    setMoreError(null)
    try {
      await callGenerateFunction(
        "generate-flashcards",
        selectedCourse.id,
        "numberOfCards",
        15,
        setGenerateMsg,
        { more: true }
      )
      await startReview(selectedCourse)
    } catch (err) {
      setMoreError((err as Error).message)
    } finally {
      setGenerating(false)
      setGenerateMsg(null)
    }
  }

  const moreCardsPanel = (
    <div className="w-full mt-8 p-5 rounded-2xl text-left border border-spark/25 bg-spark/[0.06]">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-spark/15 text-spark">
          <Sparkles size={18} />
        </div>
        <div className="flex-1 min-w-[11rem]">
          <p className="font-bold text-white text-sm">Want more cards?</p>
          <p className="text-xs text-white/50 mt-0.5">
            {allCards.length} card{allCards.length !== 1 ? "s" : ""} in this deck. Kwizo can add 15 new ones,
            different from these.
          </p>
        </div>
        <button
          onClick={generateMore}
          disabled={generating}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all bg-spark text-[#16161D] hover:bg-spark-soft disabled:opacity-60"
        >
          {generating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {generating ? "Writing new cards..." : "More cards"}
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
  )

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

  if (loading) {
    return <LoadingState label="Loading courses..." />
  }

  if (courses.length === 0) {
    return (
      <div className="p-6 md:p-8 max-w-lg mx-auto">
        <BackButton onClick={onBack} />
        <EmptyState
          icon={BookOpen}
          title="No courses yet"
          text="Upload a course first, then Kwizo makes a flashcard deck from it."
        />
      </div>
    )
  }

  if (!selectedCourse) {
    return (
      <div className="p-6 md:p-8 max-w-lg mx-auto">
        <BackButton onClick={onBack} />
        <CoursePicker
          title="Pick a deck"
          subtitle="Cards that are due come first"
          icon={Layers}
          courses={courses}
          count={(c) => c.flashcard_count}
          unit="card"
          onPick={(c) => startReview(c)}
        />
      </div>
    )
  }

  if (loadingCards) {
    return <LoadingState label="Shuffling your deck..." />
  }

  if (allCards.length === 0) {
    return (
      <div className="p-6 md:p-8 max-w-lg mx-auto">
        <BackButton onClick={() => setSelectedCourse(null)} label="Back to courses" />
        <EmptyState
          icon={BookOpen}
          tone="spark"
          title="No flashcards yet"
          text="Generate the flashcards for this course from the Dashboard first."
        />
      </div>
    )
  }

  // Nothing to review right now
  if (cards.length === 0) {
    return (
      <div className="p-6 md:p-8 max-w-lg mx-auto flex flex-col items-center text-center pt-14">
        <div className="animate-pop w-20 h-20 rounded-3xl flex items-center justify-center mb-5 bg-ok/10 border border-ok/25">
          <CheckCircle size={38} className="text-ok" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">You're all caught up</h2>
        <p className="mb-8 text-sm text-white/45">
          {nextDue
            ? `Next cards are due ${nextDue.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`
            : "No card is due for this course."}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={() => startReview(selectedCourse, true)} className={primaryButton}>
            <RotateCcw size={15} />
            Review all {allCards.length} cards anyway
          </button>
          <button onClick={() => setSelectedCourse(null)} className={secondaryButton}>
            Choose another deck
          </button>
        </div>
        {moreCardsPanel}
      </div>
    )
  }

  if (done) {
    const counts = { again: 0, hard: 0, good: 0, easy: 0 } as Record<FlashcardRating, number>
    history.forEach((r) => counts[r]++)
    const known = counts.good + counts.easy

    return (
      <div className="relative p-6 md:p-8 max-w-lg mx-auto flex flex-col items-center text-center pt-14">
        <Confetti pieces={28} />
        <div className="animate-pop w-20 h-20 rounded-3xl flex items-center justify-center mb-5 bg-spark/10 border border-spark/30 text-4xl">
          <span aria-hidden="true">🎉</span>
        </div>
        <h2 className="text-3xl font-black text-white mb-2">Deck complete!</h2>
        <p className="mb-8 text-white/45">
          {new Set(cards.map((c) => c.id)).size} cards reviewed · {known} you knew well
        </p>

        {saveFailed && <SaveWarning message="Some reviews could not be saved. Check your connection." />}

        <div className="grid grid-cols-4 gap-2 sm:gap-3 w-full max-w-sm mb-10">
          {ratings.map(({ r, label, color, bg, border }) => (
            <div key={r} className="p-3 rounded-2xl text-center" style={{ background: bg, border: `1px solid ${border}` }}>
              <p className="text-xl font-black" style={{ color }}>{counts[r]}</p>
              <p className="text-[11px] mt-0.5 text-white/40">{label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={() => startReview(selectedCourse, true)} className={primaryButton}>
            <RotateCcw size={15} />
            Review again
          </button>
          <button onClick={() => setSelectedCourse(null)} className={secondaryButton}>
            Choose another deck
          </button>
        </div>
        {moreCardsPanel}
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-lg mx-auto">
      <BackButton onClick={() => setSelectedCourse(null)} label="Exit" />

      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold tracking-wider text-white/30 truncate">
          {selectedCourse.titre.toUpperCase()}
        </p>
        <span className="text-sm text-white/45">
          <span className="font-bold text-white">{current + 1}</span> / {total}
        </span>
      </div>

      <div className="h-1.5 rounded-full overflow-hidden mb-7 bg-white/[0.07]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand to-spark"
          style={{ width: `${(current / total) * 100}%`, transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </div>

      {saveFailed && <SaveWarning message="Some reviews could not be saved. Check your connection." />}

      {/* Flashcard: a 3D card that turns over */}
      <div
        className="kz-flip cursor-pointer select-none mb-5 rounded-3xl"
        onClick={() => setFlipped((f) => !f)}
        // Space / Enter flipping is handled by the page-level keyboard listener
        role="button"
        tabIndex={0}
        aria-label={flipped ? "Show the question" : "Show the answer"}
      >
        {/* The appear animation sits on a wrapper: it would override the flip's transform */}
        <div key={card.id} className="animate-rise">
        <div className="kz-flip-inner min-h-[290px]" data-flipped={flipped}>
          <div className="kz-face rounded-3xl p-8 flex flex-col items-center justify-center text-center bg-panel border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
            <span className="absolute top-4 left-5 text-[11px] font-bold tracking-widest text-brand-soft/70">QUESTION</span>
            <Layers size={18} className="absolute top-4 right-5 text-white/15" />
            <p className="text-xl md:text-2xl font-bold text-white leading-snug">{card.recto}</p>
            <p className="absolute bottom-5 text-xs text-white/25">Tap or press Space to flip</p>
          </div>
          <div className="kz-face kz-face-back rounded-3xl p-8 flex flex-col items-center justify-center text-center bg-gradient-to-br from-brand/25 to-[#16161D] border border-brand/35 shadow-[0_20px_60px_rgba(124,92,255,0.18)]">
            <span className="absolute top-4 left-5 text-[11px] font-bold tracking-widest text-spark">ANSWER</span>
            <p className="text-base md:text-lg leading-relaxed text-white/90">{card.verso}</p>
          </div>
        </div>
        </div>
      </div>

      <p className="text-center text-xs mb-4 text-white/30">
        {flipped ? "How well did you know it?" : "Think of the answer, then flip the card"}
      </p>

      {/* Rating buttons */}
      <div
        className="grid grid-cols-4 gap-2 transition-all duration-300"
        style={{ opacity: flipped ? 1 : 0, transform: flipped ? "none" : "translateY(6px)", pointerEvents: flipped ? "auto" : "none" }}
        aria-hidden={!flipped}
      >
        {ratings.map(({ r, label, color, bg, border }, i) => (
          <button
            key={r}
            onClick={() => handleRate(r)}
            tabIndex={flipped ? 0 : -1}
            className="relative flex flex-col items-center gap-0.5 py-3 sm:py-4 rounded-2xl transition-all duration-150 active:scale-95 min-h-[64px] hover:-translate-y-0.5"
            style={{ background: bg, border: `1px solid ${border}` }}
          >
            <span className="hidden sm:block absolute top-1.5 right-2 text-[10px] font-bold text-white/25">{i + 1}</span>
            <span className="text-sm font-bold" style={{ color }}>{label}</span>
            <span className="text-[11px]" style={{ color: color + "A0" }}>
              {formatInterval(nextIntervalDays(r, intervals[card.id] ?? 0))}
            </span>
          </button>
        ))}
      </div>

      {flipped && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => setReporting(true)}
            className="inline-flex items-center gap-1 text-xs transition-colors duration-150 text-white/30 hover:text-white/70"
          >
            <Flag size={12} />
            Report this card
          </button>
        </div>
      )}

      {reporting && (
        <FeedbackDialog
          target={{ kind: "flashcard", id: card.id, text: `${card.recto} → ${card.verso}` }}
          onClose={() => setReporting(false)}
        />
      )}

      {!flipped && current > 0 && (
        <div className="flex justify-center mt-4">
          <button
            onClick={handlePrevious}
            className="inline-flex items-center gap-1 text-xs transition-colors duration-150 text-white/30 hover:text-white/65"
          >
            <ChevronLeft size={13} />
            Previous card
          </button>
        </div>
      )}
    </div>
  )
}
