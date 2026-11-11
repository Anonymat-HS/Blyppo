import { createClient, type SupabaseClient, type User } from "https://esm.sh/@supabase/supabase-js@2"

const ALLOWED_HEADERS = "authorization, x-client-info, apikey, content-type"

/**
 * CORS headers for a request. ALLOWED_ORIGINS is a comma-separated list of
 * app origins (e.g. "https://revizo.vercel.app,http://localhost:8443").
 * When it is not set every origin is accepted, which is only meant for development.
 */
function corsHeaders(req: Request): Record<string, string> {
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean)
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  }

  if (!allowed.length) {
    headers["Access-Control-Allow-Origin"] = "*"
    return headers
  }

  headers["Vary"] = "Origin"
  const origin = req.headers.get("Origin") ?? ""
  // A browser on another site gets no Allow-Origin header and blocks the response
  if (allowed.includes(origin)) headers["Access-Control-Allow-Origin"] = origin
  return headers
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

/** An error whose message is safe to show to the user. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

/** Service-role client + the authenticated caller. Throws HttpError(401) otherwise. */
export async function authenticate(
  req: Request
): Promise<{ supabase: SupabaseClient; user: User }> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "")
  if (!token) throw new HttpError(401, "Unauthorized")

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) throw new HttpError(401, "Unauthorized")
  return { supabase, user }
}

/**
 * Internal errors are logged, never sent to the client: they can contain
 * provider responses or database details.
 */
function errorResponse(err: unknown): Response {
  if (err instanceof HttpError) return json({ error: err.message }, err.status)

  const message = err instanceof Error ? err.message : String(err)
  console.error(message)

  if (/\b429\b|rate limit/i.test(message)) {
    // The frontend reads "try again in Xs" to schedule its retry
    const wait = message.match(/try again in ([\d.]+)s/)
    const hint = wait ? ` Please try again in ${wait[1]}s.` : " Please try again in a minute."
    return json({ error: `The AI service is busy.${hint}` }, 429)
  }
  return json({ error: "Something went wrong on our side. Please try again." }, 500)
}

/** Wraps a POST handler: CORS preflight, method check, error mapping, CORS headers. */
export async function handle(
  req: Request,
  handler: (req: Request) => Promise<Response>
): Promise<Response> {
  const cors = corsHeaders(req)
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  let res: Response
  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed")
    res = await handler(req)
  } catch (err) {
    res = errorResponse(err)
  }
  for (const [name, value] of Object.entries(cors)) res.headers.set(name, value)
  return res
}

/** Integer in [min, max]; falls back to `fallback` when the input is not a number. */
export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? Math.floor(value) : NaN
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}
