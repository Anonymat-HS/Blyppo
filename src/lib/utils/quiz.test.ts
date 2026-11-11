import { describe, it, expect } from "vitest"
import { findCorrectIndex, prepareQuestions } from "./quiz"
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
