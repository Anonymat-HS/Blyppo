import { supabase } from "@/lib/supabase/client"
import { retryQuery } from "./retry"
import type { CourseSummary } from "@/lib/types"

export async function fetchCourses(userId?: string): Promise<CourseSummary[]> {
  const base = supabase
    .from("courses")
    .select("id, titre, created_at")
    .order("created_at", { ascending: false })
  const query = userId ? base.eq("user_id", userId) : base
  return retryQuery<CourseSummary>(query)
}

export async function fetchRecentCourses(limit = 5): Promise<CourseSummary[]> {
  return retryQuery<CourseSummary>(
    supabase
      .from("courses")
      .select("id, titre, created_at")
      .order("created_at", { ascending: false })
      .limit(limit)
  )
}

/** Deletes a course with its questions, cards and progress (database cascade). */
export async function deleteCourse(courseId: string): Promise<void> {
  const { error } = await supabase.from("courses").delete().eq("id", courseId)
  if (error) throw new Error(error.message)
}
