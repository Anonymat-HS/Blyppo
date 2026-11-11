import { supabase } from "@/lib/supabase/client"
import { retryQuery } from "./retry"
import type { UserProgress, FlashcardProgress, QuizAttempt, StudyEvent } from "@/lib/types"

export async function fetchUserProgress(userId: string): Promise<UserProgress[]> {
  return retryQuery<UserProgress>(
    supabase
      .from("user_progress")
      .select("id, user_id, quiz_id, correct, tentatives, last_reviewed")
      .eq("user_id", userId)
  )
}

export async function fetchFlashcardProgress(
  userId: string
): Promise<FlashcardProgress[]> {
  return retryQuery<FlashcardProgress>(
    supabase
      .from("flashcard_progress")
      .select("id, user_id, flashcard_id, niveau, last_reviewed, next_review, intervalle_jours")
      .eq("user_id", userId)
  )
}

/** Finished quizzes, oldest first. */
export async function fetchQuizAttempts(userId: string): Promise<QuizAttempt[]> {
  return retryQuery<QuizAttempt>(
    supabase
      .from("quiz_attempts")
      .select("id, course_id, score, total, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
  )
}

/** Answers and reviews of the last year (streak and activity grid). */
export async function fetchStudyEvents(userId: string): Promise<StudyEvent[]> {
  const since = new Date()
  since.setDate(since.getDate() - 366)

  const pageSize = 1000
  const events: StudyEvent[] = []
  for (let from = 0; ; from += pageSize) {
    const page = await retryQuery<StudyEvent>(
      supabase
        .from("study_events")
        .select("kind, created_at")
        .eq("user_id", userId)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true })
        .range(from, from + pageSize - 1)
    )
    events.push(...page)
    if (page.length < pageSize) return events
  }
}
