import { useEffect, useState } from "react"
import { fetchStudyEvents } from "@/lib/api"
import { computeStreak } from "@/lib/utils/stats"

/**
 * Current study streak in days, or null while loading or when it could not be
 * read (a streak is a nice-to-have: failures stay silent).
 * `refreshKey` reloads it, e.g. when the user changes screen after studying.
 */
export function useStreak(userId: string | undefined, refreshKey?: unknown): number | null {
  const [streak, setStreak] = useState<number | null>(null)

  useEffect(() => {
    if (!userId) return
    let ignore = false
    fetchStudyEvents(userId)
      .then((events) => {
        if (!ignore) setStreak(computeStreak(events))
      })
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [userId, refreshKey])

  return streak
}
