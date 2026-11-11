import { supabase } from "@/lib/supabase/client"
import type { PlanLimits } from "@/lib/types"

const FREE: PlanLimits = {
  id: "free",
  max_file_mb: 20,
  daily_courses: 10,
  max_questions: 20,
  max_cards: 30,
}

/**
 * The signed-in user's plan and its limits. Never throws: the app falls back to
 * the free limits, which is also what an unassigned user gets server-side.
 */
export async function fetchMyPlan(): Promise<PlanLimits> {
  const [{ data: assignment }, { data: plans }] = await Promise.all([
    supabase.from("user_plans").select("plan").maybeSingle(),
    supabase.from("plans").select("id, max_file_mb, daily_courses, max_questions, max_cards"),
  ])

  const id = (assignment as { plan?: string } | null)?.plan ?? FREE.id
  const plan = (plans as PlanLimits[] | null)?.find((p) => p.id === id)
  return plan ?? FREE
}
