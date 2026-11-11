import { describe, it, expect } from "vitest"
import { findCorrectIndex, grade, levenshtein, matchesTyped, normalizeTyped, pickSession, prepareQuestions } from "./quiz"
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

describe("prepareQuestions with question types", () => {
  const base = { id: "q", question: "Q", bonne_reponse: "", explication: null }

  it("fills answers on an older single-answer row", () => {
    const [q] = prepareQuestions([{ ...base, options: ["a", "b", "c", "d"], bonne_reponse: "c" }])
    expect(q.type).toBe("single")
    expect(q.answers).toEqual(["c"])
  })

  it("drops a multiple-answer question whose answers are not options", () => {
    expect(prepareQuestions([{ ...base, type: "multiple", options: ["a", "b", "c", "d"], answers: ["a", "z"] }])).toEqual([])
  })

  it("keeps true / false in order", () => {
    const [q] = prepareQuestions([{ ...base, type: "true_false", options: ["true", "false"], answers: ["false"] }])
    expect(q.options).toEqual(["true", "false"])
  })

  it("never shows the items to order already in the right order", () => {
    for (let i = 0; i < 20; i++) {
      const [q] = prepareQuestions([{ ...base, type: "order", options: ["1st", "2nd", "3rd"], answers: ["1st", "2nd", "3rd"] }])
      expect(q.options).not.toEqual(["1st", "2nd", "3rd"])
      expect([...q.options].sort()).toEqual(["1st", "2nd", "3rd"])
    }
  })

  it("drops a written question without accepted answers", () => {
    expect(prepareQuestions([{ ...base, type: "short", options: [], answers: [] }])).toEqual([])
  })
})

describe("grade", () => {
  const base = { id: "q", question: "Q", bonne_reponse: "", explication: null }
  const pick = (...picked: number[]) => ({ kind: "choice" as const, picked })

  it("grades a single answer", () => {
    const q = { ...base, type: "single" as const, options: ["a", "b", "c", "d"], answers: ["c"] }
    expect(grade(q, pick(2))).toBe(true)
    expect(grade(q, pick(1))).toBe(false)
    expect(grade(q, pick(1, 2))).toBe(false)
  })

  it("grades multiple answers all-or-nothing, in any order", () => {
    const q = { ...base, type: "multiple" as const, options: ["a", "b", "c", "d"], answers: ["a", "c"] }
    expect(grade(q, pick(2, 0))).toBe(true)
    expect(grade(q, pick(0))).toBe(false)
    expect(grade(q, pick(0, 1, 2))).toBe(false)
  })

  it("grades true / false", () => {
    const q = { ...base, type: "true_false" as const, options: ["true", "false"], answers: ["false"] }
    expect(grade(q, pick(1))).toBe(true)
    expect(grade(q, pick(0))).toBe(false)
  })

  it("grades an order", () => {
    const q = { ...base, type: "order" as const, options: ["b", "a", "c"], answers: ["a", "b", "c"] }
    expect(grade(q, { kind: "order", sequence: ["a", "b", "c"] })).toBe(true)
    expect(grade(q, { kind: "order", sequence: ["b", "a", "c"] })).toBe(false)
    expect(grade(q, { kind: "order", sequence: ["a", "b"] })).toBe(false)
  })

  it("grades a typed answer leniently", () => {
    const q = { ...base, type: "short" as const, options: [], answers: ["Transmission Control Protocol", "TCP"] }
    expect(grade(q, { kind: "text", value: "tcp" })).toBe(true)
    expect(grade(q, { kind: "text", value: "Transmision control protocol" })).toBe(true)
    expect(grade(q, { kind: "text", value: "UDP" })).toBe(false)
    expect(grade(q, pick(0))).toBe(false)
  })
})

describe("matchesTyped", () => {
  it("ignores case, accents, punctuation and a leading article", () => {
    expect(normalizeTyped("  L'Équateur ! ")).toBe("equateur")
    expect(matchesTyped("la mitochondrie", ["Mitochondrie"])).toBe(true)
    expect(matchesTyped("The router", ["router"])).toBe(true)
  })

  it("forgives a typo on longer words, not on short ones", () => {
    expect(matchesTyped("mitocondrie", ["mitochondrie"])).toBe(true)
    expect(matchesTyped("mitocndrie", ["mitochondrie"])).toBe(true) // 2 edits, 12 letters
    expect(matchesTyped("ip", ["ARP"])).toBe(false)
    expect(matchesTyped("arp", ["ARP"])).toBe(true)
  })

  it("requires numbers to be exact", () => {
    expect(matchesTyped("443", ["443"])).toBe(true)
    expect(matchesTyped("444", ["443"])).toBe(false)
    expect(matchesTyped("1789", ["1798"])).toBe(false)
  })

  it("rejects an empty answer", () => {
    expect(matchesTyped("   ", ["x"])).toBe(false)
  })

  it("computes edit distances", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3)
    expect(levenshtein("", "abc")).toBe(3)
  })
})

describe("pickSession with passages", () => {
  const P = { id: "p1", text: "passage" }
  const pool = [
    { id: "a", passage: null },
    { id: "b", passage: null },
    { id: "p1-1", passage: P },
    { id: "p1-2", passage: P },
    { id: "p1-3", passage: P },
  ]

  it("keeps the questions of a passage together and complete", () => {
    for (let i = 0; i < 20; i++) {
      const ids = pickSession(pool, {}, 5).map((q) => q.id)
      const start = ids.indexOf("p1-1")
      expect(ids.slice(start, start + 3)).toEqual(["p1-1", "p1-2", "p1-3"])
    }
  })

  it("skips a passage that does not fit, unless nothing else is picked", () => {
    expect(pickSession(pool, { "p1-1": true, "p1-2": true, "p1-3": true }, 2).map((q) => q.id).sort()).toEqual(["a", "b"])
    expect(pickSession(pool.slice(2), {}, 2)).toHaveLength(3)
  })
})
