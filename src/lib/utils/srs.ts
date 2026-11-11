export type FlashcardRating = "again" | "hard" | "good" | "easy"

export type FlashcardLevel = "nouveau" | "difficile" | "bien" | "facile"

const ratingToLevel: Record<FlashcardRating, FlashcardLevel> = {
  again: "nouveau",
  hard: "difficile",
  good: "bien",
  easy: "facile",
}

const AGAIN_DELAY_MS = 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Next interval in days for a rating, given the card's current interval
 * (0 = new card or card that was forgotten). Simplified SM-2:
 * again → back to the start, hard → ×1.2, good → ×2.5, easy → ×4.
 */
export function nextIntervalDays(rating: FlashcardRating, previousDays: number): number {
  const isNew = previousDays < 1
  switch (rating) {
    case "again":
      return 0
    case "hard":
      return isNew ? 1 : Math.max(previousDays + 1, Math.round(previousDays * 1.2))
    case "good":
      return isNew ? 2 : Math.round(previousDays * 2.5)
    case "easy":
      return isNew ? 4 : Math.round(previousDays * 4)
  }
}

export function scheduleReview(
  rating: FlashcardRating,
  previousDays: number,
  now: Date
): { level: FlashcardLevel; intervalDays: number; nextReview: Date } {
  const intervalDays = nextIntervalDays(rating, previousDays)
  const delayMs = intervalDays === 0 ? AGAIN_DELAY_MS : intervalDays * DAY_MS
  return {
    level: ratingToLevel[rating],
    intervalDays,
    nextReview: new Date(now.getTime() + delayMs),
  }
}

/** Short label for a rating button: "< 1m", "3d", "2mo", "1y". */
export function formatInterval(days: number): string {
  if (days < 1) return "< 1m"
  if (days < 30) return `${days}d`
  if (days < 365) return `${Math.round(days / 30)}mo`
  return `${Math.round(days / 365)}y`
}
