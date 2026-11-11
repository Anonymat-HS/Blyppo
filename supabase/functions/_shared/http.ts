import { createClient, type SupabaseClient, type User } from "https://esm.sh/@supabase/supabase-js@2"

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

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

/** Maps any thrown error to a JSON response, keeping 429 visible to the client. */
export function errorResponse(err: unknown): Response {
  if (err instanceof HttpError) return json({ error: err.message }, err.status)
  const message = err instanceof Error ? err.message : String(err)
  const isRateLimit = /\b429\b|rate limit/i.test(message)
  return json({ error: message }, isRateLimit ? 429 : 500)
}

/** Integer in [min, max]; falls back to `fallback` when the input is not a number. */
export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? Math.floor(value) : NaN
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}
