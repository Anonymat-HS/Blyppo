/** Day of a timestamp in the user's own timezone, as "YYYY-MM-DD". */
export function localDayKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${month}-${day}`
}

/** Number of events per local day. */
export function countByDay(events: { created_at: string }[]): Record<string, number> {
  const days: Record<string, number> = {}
  for (const e of events) {
    const key = localDayKey(e.created_at)
    days[key] = (days[key] ?? 0) + 1
  }
  return days
}

/**
 * Consecutive days with activity, ending today.
 * A day without activity yet does not break the streak until it is over.
 */
export function computeStreak(events: { created_at: string }[]): number {
  const days = countByDay(events)

  let streak = 0
  const cursor = new Date()
  for (let i = 0; i < 366; i++) {
    if (days[localDayKey(cursor)]) {
      streak++
    } else if (i > 0) {
      break
    }
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}
