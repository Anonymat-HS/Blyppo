import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { authenticate, clampInt, corsHeaders, errorResponse, HttpError, json } from "../_shared/http.ts"
import { generateQuiz } from "../_shared/llm/index.ts"

const MAX_QUESTIONS = 20

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { supabase, user } = await authenticate(req)

    const body = await req.json().catch(() => ({}))
    const courseId = body?.courseId
    if (typeof courseId !== "string" || !courseId) throw new HttpError(400, "Missing courseId")
    const numberOfQuestions = clampInt(body.numberOfQuestions, 1, MAX_QUESTIONS, 10)

    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("texte_extrait")
      .eq("id", courseId)
      .eq("user_id", user.id)
      .single()
    if (courseError || !course) throw new HttpError(404, "Course not found")

    // A course is generated once: a second call must neither duplicate
    // the questions nor spend LLM quota.
    const { count, error: countError } = await supabase
      .from("quizzes")
      .select("id", { count: "exact", head: true })
      .eq("course_id", courseId)
    if (countError) throw new Error(countError.message)
    if (count) return json({ alreadyGenerated: true, count })

    const quiz = await generateQuiz(course.texte_extrait, numberOfQuestions)

    const { error: insertError } = await supabase
      .from("quizzes")
      .insert(quiz.map((q) => ({ course_id: courseId, ...q })))
    if (insertError) throw new Error(insertError.message)

    return json({ quiz })
  } catch (err) {
    return errorResponse(err)
  }
})
