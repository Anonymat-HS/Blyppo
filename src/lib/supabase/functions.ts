import { supabase } from "./client"

export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  label: string,
  setRetrying: (msg: string | null) => void
): Promise<unknown> {
  const MAX_RETRIES = 3
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const res = await fetch(url, options)
    if (res.status === 429) {
      const body = await res.json().catch(() => ({}))
      const errMsg: string = body.error || ""
      const match = errMsg.match(/try again in ([\d.]+)s/)
      const waitSec = match ? Math.ceil(parseFloat(match[1])) + 1 : 40

      if (attempt === MAX_RETRIES - 1) {
        setRetrying(`${label} — rate limit exceeded, try again later.`)
      } else {
        setRetrying(`${label} — rate limit, retrying in ${waitSec}s...`)
        await new Promise((r) => setTimeout(r, waitSec * 1000))
        setRetrying(null)
      }
      continue
    }
    const json = await res.json()
    setRetrying(null)
    if (!res.ok) throw new Error(json.error || `${label} failed`)
    return json
  }
  throw new Error(`${label} failed after retries`)
}

export async function callGenerateFunction(
  functionName: "generate-quiz" | "generate-flashcards",
  courseId: string,
  countKey: "numberOfQuestions" | "numberOfCards",
  countValue: number,
  setRetrying: (msg: string | null) => void
): Promise<unknown> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")

  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`
  return fetchWithRetry(
    functionUrl,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ courseId, [countKey]: countValue }),
    },
    functionName === "generate-quiz" ? "Quiz" : "Flashcards",
    setRetrying
  )
}
/** Permanently deletes the signed-in user's account and all their data, then signs out. */
export async function deleteAccount(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || "Could not delete the account")
  }

  // The account no longer exists server-side: only the local session is left to clear
  await supabase.auth.signOut({ scope: "local" })
}
