import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { authenticate, clampInt, corsHeaders, errorResponse, HttpError, json } from "../_shared/http.ts"
import { generateFlashcards } from "../_shared/llm/index.ts"

const MAX_CARDS = 30

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { supabase, user } = await authenticate(req)

    const body = await req.json().catch(() => ({}))
    const courseId = body?.courseId
    if (typeof courseId !== "string" || !courseId) throw new HttpError(400, "Missing courseId")
    const numberOfCards = clampInt(body.numberOfCards, 1, MAX_CARDS, 15)

    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("texte_extrait")
      .eq("id", courseId)
      .eq("user_id", user.id)
      .single()
    if (courseError || !course) throw new HttpError(404, "Course not found")

    // A course is generated once: a second call must neither duplicate
    // the cards nor spend LLM quota.
    const { count, error: countError } = await supabase
      .from("flashcards")
      .select("id", { count: "exact", head: true })
      .eq("course_id", courseId)
    if (countError) throw new Error(countError.message)
    if (count) return json({ alreadyGenerated: true, count })

    const flashcards = await generateFlashcards(course.texte_extrait, numberOfCards)

    const { error: insertError } = await supabase
      .from("flashcards")
      .insert(flashcards.map((fc) => ({ course_id: courseId, ...fc })))
    if (insertError) throw new Error(insertError.message)

    return json({ flashcards })
  } catch (err) {
    return errorResponse(err)
  }
})
