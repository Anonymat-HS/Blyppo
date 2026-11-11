import { describe, it, expect } from "vitest"
import { nextIntervalDays, scheduleReview, formatInterval } from "./srs"

const DAY = 24 * 60 * 60 * 1000

describe("nextIntervalDays", () => {
  it("sends a forgotten card back to zero, whatever its interval", () => {
    expect(nextIntervalDays("again", 0)).toBe(0)
    expect(nextIntervalDays("again", 42)).toBe(0)
  })

  it("gives a new card its first interval", () => {
    expect(nextIntervalDays("hard", 0)).toBe(1)
    expect(nextIntervalDays("good", 0)).toBe(2)
    expect(nextIntervalDays("easy", 0)).toBe(4)
  })

  it("treats anything under one day as a new card", () => {
    expect(nextIntervalDays("good", 0.5)).toBe(2)
    expect(nextIntervalDays("easy", 0.99)).toBe(4)
  })

  it("grows the interval for a card already in the schedule", () => {
    expect(nextIntervalDays("hard", 10)).toBe(12) // ×1.2 beats +1
    expect(nextIntervalDays("hard", 5)).toBe(6) // +1 beats ×1.2
    expect(nextIntervalDays("hard", 1)).toBe(2)
    expect(nextIntervalDays("good", 10)).toBe(25)
    expect(nextIntervalDays("good", 1)).toBe(3) // Math.round(2.5)
    expect(nextIntervalDays("easy", 10)).toBe(40)
  })
})

describe("scheduleReview", () => {
  const now = new Date("2026-03-15T10:00:00Z")

  it("maps the rating to the stored level", () => {
    expect(scheduleReview("again", 0, now).level).toBe("nouveau")
    expect(scheduleReview("hard", 0, now).level).toBe("difficile")
    expect(scheduleReview("good", 0, now).level).toBe("bien")
    expect(scheduleReview("easy", 0, now).level).toBe("facile")
  })

  it("brings a forgotten card back in a minute, not a day", () => {
    const review = scheduleReview("again", 12, now)
    expect(review.intervalDays).toBe(0)
    expect(review.nextReview.getTime() - now.getTime()).toBe(60 * 1000)
  })

  it("schedules the next review in days", () => {
    const review = scheduleReview("easy", 0, now)
    expect(review.intervalDays).toBe(4)
    expect(review.nextReview.getTime() - now.getTime()).toBe(4 * DAY)
  })
})

describe("formatInterval", () => {
  it("labels every magnitude", () => {
    expect(formatInterval(0)).toBe("< 1m")
    expect(formatInterval(1)).toBe("1d")
    expect(formatInterval(29)).toBe("29d")
    expect(formatInterval(30)).toBe("1mo")
    expect(formatInterval(60)).toBe("2mo")
    expect(formatInterval(364)).toBe("12mo")
    expect(formatInterval(365)).toBe("1y")
    expect(formatInterval(730)).toBe("2y")
  })
})

describe("formatInterval in French", () => {
  it("uses French units", () => {
    expect(formatInterval(0, "fr")).toBe("< 1 min")
    expect(formatInterval(4, "fr")).toBe("4 j")
    expect(formatInterval(60, "fr")).toBe("2 mois")
    expect(formatInterval(365, "fr")).toBe("1 an")
    expect(formatInterval(730, "fr")).toBe("2 ans")
  })
})
