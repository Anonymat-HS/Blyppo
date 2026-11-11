import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { authenticate, clampInt, handle, HttpError } from "../_shared/http.ts"
import { generateOnce, loadCourseText } from "../_shared/generation.ts"
import { generateFlashcards } from "../_shared/llm/index.ts"

const MAX_CARDS = 30

serve((req) =>
  handle(req, async () => {
    const { supabase, user } = await authenticate(req)

    const body = await req.json().catch(() => ({}))
    const courseId = body?.courseId
    if (typeof courseId !== "string" || !courseId) throw new HttpError(400, "Missing courseId")
    const numberOfCards = clampInt(body.numberOfCards, 1, MAX_CARDS, 15)

    const courseText = await loadCourseText(supabase, user.id, courseId)
    return generateOnce(supabase, courseId, "flashcards", () =>
      generateFlashcards(courseText, numberOfCards)
    )
  })
)
