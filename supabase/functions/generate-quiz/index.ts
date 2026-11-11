import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { authenticate, clampInt, handle, HttpError } from "../_shared/http.ts"
import { generateOnce, loadCourseText } from "../_shared/generation.ts"
import { generateQuiz } from "../_shared/llm/index.ts"
import { getPlanLimits } from "../_shared/plans.ts"

serve((req) =>
  handle(req, async () => {
    const { supabase, user } = await authenticate(req)

    const body = await req.json().catch(() => ({}))
    const courseId = body?.courseId
    if (typeof courseId !== "string" || !courseId) throw new HttpError(400, "Missing courseId")
    const { max_questions } = await getPlanLimits(supabase, user.id)
    const numberOfQuestions = clampInt(
      body.numberOfQuestions,
      1,
      max_questions,
      Math.min(10, max_questions)
    )

    const courseText = await loadCourseText(supabase, user.id, courseId)
    return generateOnce(supabase, courseId, "quiz", () => generateQuiz(courseText, numberOfQuestions))
  })
)
