import { useCallback, useEffect, useMemo, useState } from "react"
import {
  fetchCourses,
  fetchUserProgress,
  fetchFlashcardProgress,
  fetchQuizAttempts,
  fetchStudyEvents,
  fetchQuizIdsByCourseIds,
  fetchFlashcardIdsByCourseIds,
} from "@/lib/api"
import { computeStreak } from "@/lib/utils/stats"
import type {
  CourseSummary,
  UserProgress,
  FlashcardProgress,
  QuizAttempt,
  StudyEvent,
} from "@/lib/types"

export interface CourseStat {
  id: string
  title: string
  color: string
  quizCount: number
  flashcardCount: number
  correctCount: number
  progress: number
}

type IdRow = { id: string; course_id: string }

const courseColors = ["#7C5CFF", "#00D9FF", "#F59E0B", "#22C55E", "#EC4899", "#F97316"]

export function useUserStats(userId?: string) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [courses, setCourses] = useState<CourseSummary[]>([])
  const [progressRows, setProgressRows] = useState<UserProgress[]>([])
  const [flashRows, setFlashRows] = useState<FlashcardProgress[]>([])
  const [attempts, setAttempts] = useState<QuizAttempt[]>([])
  const [events, setEvents] = useState<StudyEvent[]>([])
  const [quizIds, setQuizIds] = useState<IdRow[]>([])
  const [flashIds, setFlashIds] = useState<IdRow[]>([])

  const reload = useCallback(() => {
    setLoading(true)
    setError(null)
    setReloadKey((k) => k + 1)
  }, [])

  useEffect(() => {
    if (!userId) return
    const uid = userId
    let ignore = false

    async function load() {
      const [coursesData, progressData, flashData, attemptData, eventData] = await Promise.all([
        fetchCourses(uid),
        fetchUserProgress(uid),
        fetchFlashcardProgress(uid),
        fetchQuizAttempts(uid),
        fetchStudyEvents(uid),
      ])

      const courseIds = coursesData.map((c) => c.id)
      const [quizIdData, flashIdData] = await Promise.all([
        fetchQuizIdsByCourseIds(courseIds),
        fetchFlashcardIdsByCourseIds(courseIds),
      ])

      if (ignore) return
      setCourses(coursesData)
      setProgressRows(progressData)
      setFlashRows(flashData)
      setAttempts(attemptData)
      setEvents(eventData)
      setQuizIds(quizIdData)
      setFlashIds(flashIdData)
    }

    load()
      .catch((err) => {
        if (!ignore) setError((err as Error).message)
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [userId, reloadKey])

  return useMemo(() => {
    const answered = progressRows.filter((r) => r.correct !== null)
    const answeredCount = answered.length
    const correctCount = answered.filter((r) => r.correct).length

    const quizByCourse: Record<string, { id: string }[]> = {}
    for (const q of quizIds) {
      if (!quizByCourse[q.course_id]) quizByCourse[q.course_id] = []
      quizByCourse[q.course_id].push(q)
    }
    const flashByCourse: Record<string, { id: string }[]> = {}
    for (const f of flashIds) {
      if (!flashByCourse[f.course_id]) flashByCourse[f.course_id] = []
      flashByCourse[f.course_id].push(f)
    }

    const lastCorrect: Record<string, boolean> = {}
    for (const p of progressRows) {
      if (p.correct !== null) lastCorrect[p.quiz_id] = p.correct
    }

    const breakdown: CourseStat[] = courses.map((c, i) => {
      const cQuizzes = quizByCourse[c.id] || []
      const correct = cQuizzes.filter((q) => lastCorrect[q.id] === true).length
      return {
        id: c.id,
        title: c.titre,
        color: courseColors[i % courseColors.length],
        quizCount: cQuizzes.length,
        flashcardCount: (flashByCourse[c.id] || []).length,
        correctCount: correct,
        progress: cQuizzes.length ? Math.round((correct / cQuizzes.length) * 100) : 0,
      }
    })

    return {
      loading,
      error,
      reload,
      courses,
      attempts,
      events,
      breakdown,
      /** Questions answered at least once */
      answeredCount,
      correctCount,
      /** Finished quizzes */
      quizzesTaken: attempts.length,
      /** Distinct flashcards reviewed at least once */
      flashcardsReviewed: flashRows.length,
      /** Share of questions whose latest answer is correct */
      avgScore: answeredCount ? Math.round((correctCount / answeredCount) * 100) : 0,
      streak: computeStreak(events),
    }
  }, [loading, error, reload, courses, progressRows, flashRows, attempts, events, quizIds, flashIds])
}
