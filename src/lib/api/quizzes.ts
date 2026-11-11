import { supabase } from "@/lib/supabase/client"
import { retryQuery } from "./retry"
import type { QuizQuestion } from "@/lib/types"

export async function fetchQuizCountsByCourses(
  courseIds: string[]
): Promise<Record<string, number>> {
  if (!courseIds.length) return {}
  const rows = await retryQuery<{ course_id: string }>(
    supabase.from("quizzes").select("course_id").in("course_id", courseIds)
  )
  const counts: Record<string, number> = {}
  for (const r of rows) counts[r.course_id] = (counts[r.course_id] ?? 0) + 1
  return counts
}

export async function fetchQuestionsForCourse(
  courseId: string
): Promise<QuizQuestion[]> {
  return retryQuery<QuizQuestion>(
    supabase
      .from("quizzes")
      .select("id, question, options, bonne_reponse, explication")
      .eq("course_id", courseId)
      .order("created_at", { ascending: true })
  )
}

export async function fetchQuizIdsByCourseIds(
  courseIds: string[]
): Promise<{ id: string; course_id: string }[]> {
  if (!courseIds.length) return []
  return retryQuery<{ id: string; course_id: string }>(
    supabase.from("quizzes").select("id, course_id").in("course_id", courseIds)
  )
}

/**
 * Saves the latest answer to a question (one row per user and question)
 * and logs the activity. Throws if the answer could not be saved.
 */
export async function recordQuizAnswer(
  userId: string,
  quizId: string,
  correct: boolean
): Promise<void> {
  const { data: existing, error: readError } = await supabase
    .from("user_progress")
    .select("tentatives")
    .eq("user_id", userId)
    .eq("quiz_id", quizId)
    .maybeSingle()
  if (readError) throw new Error(readError.message)

  const { error } = await supabase.from("user_progress").upsert(
    {
      user_id: userId,
      quiz_id: quizId,
      correct,
      tentatives: (existing?.tentatives ?? 0) + 1,
      last_reviewed: new Date().toISOString(),
    },
    { onConflict: "user_id,quiz_id" }
  )
  if (error) throw new Error(error.message)

  const { error: eventError } = await supabase
    .from("study_events")
    .insert({ user_id: userId, kind: "quiz_answer" })
  if (eventError) throw new Error(eventError.message)
}

/** Saves the result of a finished quiz. Throws if it could not be saved. */
export async function recordQuizAttempt(
  userId: string,
  courseId: string,
  score: number,
  total: number
): Promise<void> {
  const { error } = await supabase
    .from("quiz_attempts")
    .insert({ user_id: userId, course_id: courseId, score, total })
  if (error) throw new Error(error.message)
}
