import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

export interface PlanLimits {
  id: string
  max_file_mb: number
  daily_courses: number
  max_questions: number
  max_cards: number
  /** Generation rounds per course and per kind (004) */
  max_rounds: number
}

/** What the app enforced before plans existed; also used when 003 / 004 are not applied yet. */
const FREE: PlanLimits = {
  id: "free",
  max_file_mb: 20,
  daily_courses: 10,
  max_questions: 20,
  max_cards: 30,
  max_rounds: 3,
}

/** Limits for a user's plan. `plans` is the single source of truth; no row means free. */
export async function getPlanLimits(
  supabase: SupabaseClient,
  userId: string
): Promise<PlanLimits> {
  const { data: assignment } = await supabase
    .from("user_plans")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle()

  const { data: plan } = await supabase
    .from("plans")
    .select("id, max_file_mb, daily_courses, max_questions, max_cards, max_rounds")
    .eq("id", assignment?.plan ?? FREE.id)
    .maybeSingle()

  return (plan as PlanLimits | null) ?? FREE
}
