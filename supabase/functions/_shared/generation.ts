import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { HttpError, json } from "./http.ts"

type Kind = "quiz" | "flashcards"

const TABLE: Record<Kind, string> = { quiz: "quizzes", flashcards: "flashcards" }
/** Column holding the text of a question / card, sent back to the LLM to avoid repeats */
const TEXT_COLUMN: Record<Kind, string> = { quiz: "question", flashcards: "recto" }
// A claim older than this with nothing generated comes from a crashed run
const STALE_CLAIM_MS = 3 * 60 * 1000
const UNIQUE_VIOLATION = "23505"

/** The caller's course text, or 404 when the course is not theirs. */
export async function loadCourseText(
  supabase: SupabaseClient,
  userId: string,
  courseId: string
): Promise<string> {
  const { data: course, error } = await supabase
    .from("courses")
    .select("texte_extrait")
    .eq("id", courseId)
    .eq("user_id", userId)
    .single()
  if (error || !course) throw new HttpError(404, "Course not found")
  return course.texte_extrait
}

export interface NextRound {
  round: number
  /** Questions (or card fronts) the course already has */
  existing: string[]
}

/**
 * The round a "new questions" request would create, and what the course
 * already has. Throws 403 once the plan's number of rounds is used up.
 */
export async function nextRound(
  supabase: SupabaseClient,
  courseId: string,
  kind: Kind,
  maxRounds: number
): Promise<NextRound> {
  const column = TEXT_COLUMN[kind]
  const { data, error } = await supabase
    .from(TABLE[kind])
    .select(`round, ${column}`)
    .eq("course_id", courseId)
  if (error) throw new Error(error.message)

  const rows = (data ?? []) as Record<string, unknown>[]
  const round = rows.reduce((max, r) => Math.max(max, Number(r.round) || 1), 0) + 1
  if (round > maxRounds) {
    const what = kind === "quiz" ? "question sets" : "card sets"
    throw new HttpError(
      403,
      `You have used the ${maxRounds} ${what} your plan allows for this course.`
    )
  }
  return { round, existing: rows.map((r) => String(r[column] ?? "")).filter(Boolean) }
}

/**
 * Generates one round of content for a course at most once, even when two
 * requests arrive together: the (course, kind, round) primary key of
 * course_generations lets a single request claim the work.
 * Returns the JSON response for the caller.
 */
export async function generateOnce<T extends object>(
  supabase: SupabaseClient,
  courseId: string,
  kind: Kind,
  generate: () => Promise<T[]>,
  round = 1
): Promise<Response> {
  const table = TABLE[kind]

  const { error: claimError } = await supabase
    .from("course_generations")
    .insert({ course_id: courseId, kind, round })

  if (claimError) {
    if (claimError.code !== UNIQUE_VIOLATION) throw new Error(claimError.message)

    const { count, error: countError } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("course_id", courseId)
      .eq("round", round)
    if (countError) throw new Error(countError.message)
    if (count) return json({ alreadyGenerated: true, count, round })

    // Nothing generated yet: either another request is working on it, or it crashed.
    // Taking over a stale claim is a conditional update, so only one request wins.
    const staleBefore = new Date(Date.now() - STALE_CLAIM_MS).toISOString()
    const { data: takenOver, error: takeOverError } = await supabase
      .from("course_generations")
      .update({ created_at: new Date().toISOString() })
      .eq("course_id", courseId)
      .eq("kind", kind)
      .eq("round", round)
      .lt("created_at", staleBefore)
      .select("course_id")
    if (takeOverError) throw new Error(takeOverError.message)
    if (!takenOver?.length) {
      throw new HttpError(409, "Generation is already in progress for this course. Please wait a moment.")
    }
  }

  try {
    const items = await generate()
    const { error: insertError } = await supabase
      .from(table)
      .insert(items.map((item) => ({ course_id: courseId, round, ...item })))
    if (insertError) throw new Error(insertError.message)
    return json({ [kind]: items, round })
  } catch (err) {
    // Release this round's claim so the user can retry
    await supabase
      .from("course_generations")
      .delete()
      .eq("course_id", courseId)
      .eq("kind", kind)
      .eq("round", round)
    throw err
  }
}
