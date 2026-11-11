import { describe, it, expect } from "vitest"
import { parseQuiz, parseFlashcards } from "./parse"

const valid = {
  question: " What is 2 + 2? ",
  options: ["3", "4", "5", "6"],
  bonne_reponse_index: 1,
  explication: " Basic arithmetic ",
}

describe("parseQuiz", () => {
  it("reads a bare array and resolves the answer from its index", () => {
    const [item] = parseQuiz(JSON.stringify([valid]))
    expect(item.question).toBe("What is 2 + 2?")
    expect(item.options).toEqual(["3", "4", "5", "6"])
    expect(item.bonne_reponse).toBe("4")
    expect(item.explication).toBe("Basic arithmetic")
  })

  it("reads a { questions: [...] } object", () => {
    expect(parseQuiz(JSON.stringify({ questions: [valid] }))).toHaveLength(1)
  })

  it("unwraps JSON surrounded by prose or a code fence", () => {
    const raw = "Here you go:\n```json\n" + JSON.stringify([valid]) + "\n```\nEnjoy."
    expect(parseQuiz(raw)).toHaveLength(1)
  })

  it("rejects invalid JSON", () => {
    expect(() => parseQuiz("not json at all")).toThrow(/not valid JSON/)
  })

  it("rejects a response without a questions array", () => {
    expect(() => parseQuiz(JSON.stringify({ cards: [] }))).toThrow(/no "questions" array/)
  })

  it("drops malformed questions instead of storing them", () => {
    const malformed = [
      { ...valid, options: ["3", "4", "5"] }, // three options
      { ...valid, options: ["3", "4", "5", "6", "7"] }, // five options
      { ...valid, options: ["3", "4", "4", "6"] }, // duplicate option
      { ...valid, options: ["3", "", "5", "6"] }, // empty option
      { ...valid, options: "4" }, // not an array
      { ...valid, question: "   " }, // empty question
      { ...valid, bonne_reponse_index: 4 }, // out of range
      { ...valid, bonne_reponse_index: 1.5 }, // not an integer
      { ...valid, bonne_reponse_index: "1" }, // not a number
    ]
    for (const entry of malformed) {
      expect(() => parseQuiz(JSON.stringify([entry]))).toThrow(/no usable quiz question/)
    }
  })

  it("keeps the well-formed entries of a mixed response", () => {
    const items = parseQuiz(JSON.stringify([valid, { ...valid, options: ["1", "2"] }]))
    expect(items).toHaveLength(1)
  })

  it("defaults a missing explanation to an empty string", () => {
    const [item] = parseQuiz(JSON.stringify([{ ...valid, explication: undefined }]))
    expect(item.explication).toBe("")
  })
})

describe("parseFlashcards", () => {
  it("reads both sides, trimmed", () => {
    const raw = JSON.stringify({ flashcards: [{ recto: " Q ", verso: " A " }] })
    expect(parseFlashcards(raw)).toEqual([{ recto: "Q", verso: "A" }])
  })

  it("drops cards missing a side", () => {
    const raw = JSON.stringify({ flashcards: [{ recto: "Q", verso: "A" }, { recto: "Q", verso: " " }] })
    expect(parseFlashcards(raw)).toHaveLength(1)
  })

  it("throws when nothing is usable", () => {
    expect(() => parseFlashcards(JSON.stringify({ flashcards: [] }))).toThrow(/no usable flashcard/)
  })
})
