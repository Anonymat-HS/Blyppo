import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { localDayKey, countByDay, computeStreak } from "./stats"

/** Noon on a local day: avoids DST edges shifting the date. */
function at(year: number, month: number, day: number): string {
  return new Date(year, month - 1, day, 12).toISOString()
}

describe("localDayKey", () => {
  it("uses the local date, zero-padded", () => {
    expect(localDayKey(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05")
    expect(localDayKey(new Date(2026, 8, 9))).toBe("2026-09-09")
  })

  it("accepts a timestamp string", () => {
    expect(localDayKey(at(2026, 3, 15))).toBe("2026-03-15")
  })
})

describe("countByDay", () => {
  it("counts events per local day", () => {
    const events = [
      { created_at: at(2026, 3, 15) },
      { created_at: at(2026, 3, 15) },
      { created_at: at(2026, 3, 14) },
    ]
    expect(countByDay(events)).toEqual({ "2026-03-15": 2, "2026-03-14": 1 })
  })

  it("returns an empty record without events", () => {
    expect(countByDay([])).toEqual({})
  })
})

describe("computeStreak", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // 15 March 2026, 10:00 local
    vi.setSystemTime(new Date(2026, 2, 15, 10))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("counts consecutive days up to today", () => {
    const events = [
      { created_at: at(2026, 3, 15) },
      { created_at: at(2026, 3, 15) },
      { created_at: at(2026, 3, 14) },
      { created_at: at(2026, 3, 13) },
    ]
    expect(computeStreak(events)).toBe(3)
  })

  it("does not break the streak when today has no activity yet", () => {
    const events = [{ created_at: at(2026, 3, 14) }, { created_at: at(2026, 3, 13) }]
    expect(computeStreak(events)).toBe(2)
  })

  it("stops at the first missed day", () => {
    const events = [
      { created_at: at(2026, 3, 15) },
      { created_at: at(2026, 3, 13) }, // 14 March missing
    ]
    expect(computeStreak(events)).toBe(1)
  })

  it("is zero without activity", () => {
    expect(computeStreak([])).toBe(0)
  })
})
