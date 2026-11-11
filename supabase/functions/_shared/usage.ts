import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { HttpError } from "./http.ts"

export type UsageKind = "course_upload" | "generation"

/**
 * Records one costly action (an upload, an LLM call) if the user is under
 * `limit` for the last `windowSeconds`, atomically (migration 006, claim_usage).
 * The log is separate from courses, so deleting content never gives quota back.
 * Returns how many uses the window now holds; throws 403 with `refusal` when full.
 */
export async function claimUsage(
  supabase: SupabaseClient,
  userId: string,
  kind: UsageKind,
  limit: number,
  windowSeconds: number,
  refusal: string
): Promise<number> {
  const { data, error } = await supabase.rpc("claim_usage", {
    p_user: userId,
    p_kind: kind,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })
  if (error) throw new Error(`claim_usage: ${error.message}`)
  const used = Number(data)
  if (!Number.isFinite(used) || used < 0) throw new HttpError(403, refusal)
  return used
}
