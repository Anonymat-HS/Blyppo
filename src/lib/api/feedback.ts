import { supabase } from "@/lib/supabase/client"

export type ReportReason = "wrong_answer" | "unclear" | "off_topic" | "typo" | "other"

export type FeedbackInput =
  | { kind: "question"; quizId: string; reason: ReportReason; message?: string; snapshot?: string }
  | { kind: "flashcard"; flashcardId: string; reason: ReportReason; message?: string; snapshot?: string }
  | { kind: "general"; rating?: number; message: string; page?: string }

/** Sends a report or a feedback message. Throws if it could not be saved. */
export async function submitFeedback(input: FeedbackInput): Promise<void> {
  const row: Record<string, unknown> = { kind: input.kind, message: input.message?.trim() || null }
  if (input.kind === "question") Object.assign(row, { quiz_id: input.quizId, reason: input.reason, page: "quiz" })
  if (input.kind === "flashcard") Object.assign(row, { flashcard_id: input.flashcardId, reason: input.reason, page: "flashcards" })
  if (input.kind !== "general") row.snapshot = input.snapshot?.slice(0, 1000) ?? null
  if (input.kind === "general") Object.assign(row, { rating: input.rating ?? null, page: input.page ?? null })

  const { error } = await supabase.from("feedback").insert(row)
  if (error) throw new Error(error.message)
}
