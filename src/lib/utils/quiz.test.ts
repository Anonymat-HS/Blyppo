import { describe, it, expect } from "vitest"
import { findCorrectIndex, pickSession, prepareQuestions } from "./quiz"
import type { QuizQuestion } from "@/lib/types"

function question(options: string[], bonne_reponse: string): QuizQuestion {
  return { id: "q1", question: "Which one?", options, bonne_reponse, explication: null }
}

describe("findCorrectIndex", () => {
  const options = ["Alpha", "Beta", "Gamma", "Delta"]

  it("finds the option by exact text", () => {
    expect(findCorrectIndex(question(options, "Gamma"))).toBe(2)
  })

  it("ignores case and extra spaces", () => {
    expect(findCorrectIndex(question(["New  York", "Paris", "Rome", "Oslo"], "new york"))).toBe(0)
    expect(findCorrectIndex(question(options, "  gamma  "))).toBe(2)
  })

  it("accepts a stored letter", () => {
    expect(findCorrectIndex(question(options, "B"))).toBe(1)
    expect(findCorrectIndex(question(options, "b)"))).toBe(1)
    expect(findCorrectIndex(question(options, "C. Gamma"))).toBe(2)
  })

  it("rejects a letter pointing past the last option", () => {
    expect(findCorrectIndex(question(["Alpha", "Beta", "Gamma", "Delta"], "D"))).toBe(3)
    expect(findCorrectIndex(question(["Alpha", "Beta"], "D"))).toBe(-1)
  })

  it("accepts a reworded answer when it matches a single option", () => {
    expect(findCorrectIndex(question(options, "the answer is Gamma"))).toBe(2)
  })

  it("refuses an ambiguous answer", () => {
    expect(findCorrectIndex(question(["cat", "dog"], "cat or dog"))).toBe(-1)
  })
})

describe("prepareQuestions", () => {
  it("drops questions that cannot be graded", () => {
    const kept = question(["A", "B", "C", "D"], "B")
    const prepared = prepareQuestions([kept, question(["A", "B", "C", "D"], "??")])
    expect(prepared).toHaveLength(1)
  })

  it("stores the answer as the exact option text", () => {
    const [prepared] = prepareQuestions([question(["Alpha", "Beta", "Gamma", "Delta"], "B")])
    expect(prepared.bonne_reponse).toBe("Beta")
  })

  it("keeps the four options and stays gradable after shuffling", () => {
    const original = ["Alpha", "Beta", "Gamma", "Delta"]
    for (let i = 0; i < 25; i++) {
      const [prepared] = prepareQuestions([question(original, "Gamma")])
      expect([...prepared.options].sort()).toEqual([...original].sort())
      const idx = findCorrectIndex(prepared)
      expect(idx).not.toBe(-1)
      expect(prepared.options[idx]).toBe("Gamma")
    }
  })

  it("returns an empty list for an empty input", () => {
    expect(prepareQuestions([])).toEqual([])
  })
})

describe("pickSession", () => {
  const pool = Array.from({ length: 30 }, (_, i) => ({ id: `q${i}` }))
  const ids = (qs: { id: string }[]) => qs.map((q) => q.id).sort()

  it("returns at most the session size, without duplicates", () => {
    const picked = pickSession(pool, {}, 10)
    expect(picked).toHaveLength(10)
    expect(new Set(ids(picked)).size).toBe(10)
  })

  it("returns every question when the course has fewer than the session size", () => {
    expect(ids(pickSession(pool.slice(0, 4), {}, 10))).toEqual(["q0", "q1", "q2", "q3"])
  })

  it("prefers never-answered questions", () => {
    // q0..q19 answered, q20..q29 never seen
    const seen = Object.fromEntries(pool.slice(0, 20).map((q) => [q.id, true]))
    expect(ids(pickSession(pool, seen, 10))).toEqual(ids(pool.slice(20)))
  })

  it("then the missed ones, before the known ones", () => {
    const last: Record<string, boolean> = {}
    pool.forEach((q, i) => (last[q.id] = i >= 25)) // q0..q24 missed, q25..q29 known
    const picked = ids(pickSession(pool.slice(20), last, 5)) // q20..q24 missed, q25..q29 known
    expect(picked).toEqual(["q20", "q21", "q22", "q23", "q24"])
  })

  it("does not always return the same order", () => {
    const orders = new Set(
      Array.from({ length: 20 }, () => pickSession(pool.slice(0, 6), {}, 6).map((q) => q.id).join())
    )
    expect(orders.size).toBeGreaterThan(1)
  })
})
