import { supabase } from "@/lib/supabase/client"
import { retryQuery } from "./retry"
import { scheduleReview, type FlashcardRating } from "@/lib/utils/srs"
import type { FlashcardProgress, FlashcardReviewCard } from "@/lib/types"

export async function fetchFlashcardCountsByCourses(
  courseIds: string[]
): Promise<Record<string, number>> {
  if (!courseIds.length) return {}
  const rows = await retryQuery<{ course_id: string }>(
    supabase.from("flashcards").select("course_id").in("course_id", courseIds)
  )
  const counts: Record<string, number> = {}
  for (const r of rows) counts[r.course_id] = (counts[r.course_id] ?? 0) + 1
  return counts
}

export async function fetchCardsForCourse(
  courseId: string
): Promise<FlashcardReviewCard[]> {
  return retryQuery<FlashcardReviewCard>(
    supabase
      .from("flashcards")
      .select("id, recto, verso")
      .eq("course_id", courseId)
      .order("created_at", { ascending: true })
  )
}

export async function fetchFlashcardIdsByCourseIds(
  courseIds: string[]
): Promise<{ id: string; course_id: string }[]> {
  if (!courseIds.length) return []
  return retryQuery<{ id: string; course_id: string }>(
    supabase.from("flashcards").select("id, course_id").in("course_id", courseIds)
  )
}

/** The user's review state for the given cards, keyed by flashcard id. */
export async function fetchProgressForCards(
  userId: string,
  flashcardIds: string[]
): Promise<Record<string, FlashcardProgress>> {
  if (!flashcardIds.length) return {}
  const rows = await retryQuery<FlashcardProgress>(
    supabase
      .from("flashcard_progress")
      .select("id, user_id, flashcard_id, niveau, last_reviewed, next_review, intervalle_jours")
      .eq("user_id", userId)
      .in("flashcard_id", flashcardIds)
  )
  const byCard: Record<string, FlashcardProgress> = {}
  for (const r of rows) byCard[r.flashcard_id] = r
  return byCard
}

/**
 * Saves a rating and schedules the next review of the card.
 * `previousIntervalDays` is the card's interval before this session (0 for a new card).
 * Throws if the review could not be saved.
 */
export async function recordFlashcardRating(
  userId: string,
  flashcardId: string,
  rating: FlashcardRating,
  previousIntervalDays: number
): Promise<void> {
  const now = new Date()
  const { level, intervalDays, nextReview } = scheduleReview(rating, previousIntervalDays, now)

  const { error } = await supabase.from("flashcard_progress").upsert(
    {
      user_id: userId,
      flashcard_id: flashcardId,
      niveau: level,
      intervalle_jours: intervalDays,
      last_reviewed: now.toISOString(),
      next_review: nextReview.toISOString(),
    },
    { onConflict: "user_id,flashcard_id" }
  )
  if (error) throw new Error(error.message)

  const { error: eventError } = await supabase
    .from("study_events")
    .insert({ user_id: userId, kind: "flashcard_review" })
  if (eventError) throw new Error(eventError.message)
}
