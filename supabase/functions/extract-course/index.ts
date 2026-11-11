import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@1.6.2"
import { authenticate, handle, HttpError, json } from "../_shared/http.ts"
import { getPlanLimits } from "../_shared/plans.ts"
import { claimUsage } from "../_shared/usage.ts"

const MAX_TITLE_CHARS = 200
// Stored text is capped: the LLM only reads a sample of it anyway.
const MAX_TEXT_CHARS = 500_000
// Edge Functions hold the whole upload in memory: never accept more than this,
// whatever the plan says.
const HARD_MAX_FILE_MB = 50
const DAY_SECONDS = 24 * 60 * 60

serve((req) =>
  handle(req, async () => {
    const { supabase, user } = await authenticate(req)
    const limits = await getPlanLimits(supabase, user.id)
    const maxFileMb = Math.min(limits.max_file_mb, HARD_MAX_FILE_MB)

    // Refuse an oversized body before buffering it (multipart overhead allowed)
    const declared = Number(req.headers.get("Content-Length") ?? "0")
    if (declared > (maxFileMb + 1) * 1024 * 1024) {
      throw new HttpError(413, `File exceeds the ${maxFileMb} MB limit`)
    }

    const formData = await req.formData().catch(() => null)
    const file = formData?.get("file")
    const titre = String(formData?.get("titre") ?? "").trim().slice(0, MAX_TITLE_CHARS)

    if (!(file instanceof File) || !titre) throw new HttpError(400, "Missing file or titre")
    if (file.size > maxFileMb * 1024 * 1024) {
      throw new HttpError(413, `File exceeds the ${maxFileMb} MB limit`)
    }

    const fileName = file.name.toLowerCase()
    const isPdf = fileName.endsWith(".pdf")
    if (!isPdf && !fileName.endsWith(".txt") && !fileName.endsWith(".md")) {
      throw new HttpError(415, "Unsupported file type. Please upload a PDF, TXT, or MD file.")
    }

    // Each course costs two LLM calls: cap how many a user can upload per day.
    // Counted in usage_events (atomic, and deleting a course does not give the
    // quota back), before extracting text or calling the LLM.
    const limit = limits.daily_courses
    const used = await claimUsage(
      supabase,
      user.id,
      "course_upload",
      limit,
      DAY_SECONDS,
      `Daily limit reached (${limit} courses per 24 hours). Try again tomorrow.`
    )

    const bytes = new Uint8Array(await file.arrayBuffer())
    let texteExtrait: string
    if (isPdf) {
      try {
        const pdf = await getDocumentProxy(bytes)
        const { text } = await extractText(pdf, { mergePages: true })
        texteExtrait = text
      } catch {
        throw new HttpError(422, "This PDF could not be read. It may be damaged or password-protected.")
      }
    } else {
      texteExtrait = new TextDecoder().decode(bytes)
    }
    texteExtrait = texteExtrait.trim().slice(0, MAX_TEXT_CHARS)

    if (!texteExtrait) {
      throw new HttpError(
        422,
        isPdf
          ? "No text found in this PDF. It is probably a scan (images only), which is not supported yet."
          : "The file is empty."
      )
    }

    const { data: course, error: dbError } = await supabase
      .from("courses")
      .insert({ user_id: user.id, titre, texte_extrait: texteExtrait })
      .select("id, titre, created_at")
      .single()
    if (dbError) throw new Error(dbError.message)

    return json({
      course,
      plan: limits.id,
      quota: { used, limit },
    })
  })
)
