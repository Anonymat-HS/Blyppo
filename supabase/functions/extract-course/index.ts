import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@1.6.2"
import { authenticate, handle, HttpError, json } from "../_shared/http.ts"

const MAX_FILE_BYTES = 20 * 1024 * 1024
const MAX_TITLE_CHARS = 200
// Stored text is capped: the LLM only reads a sample of it anyway.
const MAX_TEXT_CHARS = 500_000
const DEFAULT_DAILY_COURSE_LIMIT = 10

function dailyCourseLimit(): number {
  const fromEnv = parseInt(Deno.env.get("DAILY_COURSE_LIMIT") ?? "", 10)
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_DAILY_COURSE_LIMIT
}

serve((req) =>
  handle(req, async () => {
    const { supabase, user } = await authenticate(req)

    const formData = await req.formData().catch(() => null)
    const file = formData?.get("file")
    const titre = String(formData?.get("titre") ?? "").trim().slice(0, MAX_TITLE_CHARS)

    if (!(file instanceof File) || !titre) throw new HttpError(400, "Missing file or titre")
    if (file.size > MAX_FILE_BYTES) throw new HttpError(413, "File exceeds the 20 MB limit")

    const fileName = file.name.toLowerCase()
    const isPdf = fileName.endsWith(".pdf")
    if (!isPdf && !fileName.endsWith(".txt") && !fileName.endsWith(".md")) {
      throw new HttpError(415, "Unsupported file type. Please upload a PDF, TXT, or MD file.")
    }

    // Each course costs two LLM calls: cap how many a user can create per day.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count, error: countError } = await supabase
      .from("courses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", since)
    if (countError) throw new Error(countError.message)
    const limit = dailyCourseLimit()
    if ((count ?? 0) >= limit) {
      throw new HttpError(403, `Daily limit reached (${limit} courses per 24 hours). Try again tomorrow.`)
    }

    const bytes = new Uint8Array(await file.arrayBuffer())
    let texteExtrait = ""
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

    return json({ course })
  })
)
