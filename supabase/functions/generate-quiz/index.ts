import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { authenticate, clampInt, handle, HttpError } from "../_shared/http.ts"
import { generateOnce, loadCourseText, nextRound } from "../_shared/generation.ts"
import { generateQuiz } from "../_shared/llm/index.ts"
import { getPlanLimits } from "../_shared/plans.ts"

serve((req) =>
  handle(req, async () => {
    const { supabase, user } = await authenticate(req)

    const body = await req.json().catch(() => ({}))
    const courseId = body?.courseId
    if (typeof courseId !== "string" || !courseId) throw new HttpError(400, "Missing courseId")
    const { max_questions, max_rounds } = await getPlanLimits(supabase, user.id)
    const numberOfQuestions = clampInt(
      body.numberOfQuestions,
      1,
      max_questions,
      Math.min(10, max_questions)
    )

    const courseText = await loadCourseText(supabase, user.id, courseId)

    // { more: true } asks for a new set of questions, different from the existing ones
    if (body.more === true) {
      const { round, existing } = await nextRound(supabase, courseId, "quiz", max_rounds)
      return generateOnce(
        supabase,
        user.id,
        courseId,
        "quiz",
        () => generateQuiz(courseText, numberOfQuestions, { round, avoid: existing }),
        round
      )
    }
    return generateOnce(supabase, user.id, courseId, "quiz", () => generateQuiz(courseText, numberOfQuestions))
  })
)
