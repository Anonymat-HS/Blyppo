import { describe, it, expect } from "vitest"
import { limitQuestions, parseQuiz, parseFlashcards } from "./parse"

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

describe("parseQuiz question types", () => {
  const one = (q: object) => parseQuiz(JSON.stringify({ questions: [q] }))

  it("reads the old format as a single-answer question", () => {
    const [item] = one(valid)
    expect(item.type).toBe("single")
    expect(item.answers).toEqual(["4"])
  })

  it("reads a single-answer question with answer_index", () => {
    const [item] = one({ type: "single", question: "Q", options: ["a", "b", "c", "d"], answer_index: 2 })
    expect(item).toMatchObject({ type: "single", answers: ["c"], bonne_reponse: "c" })
  })

  it("reads a multiple-answer question, deduplicating and sorting indexes", () => {
    const [item] = one({ type: "multiple", question: "Q", options: ["a", "b", "c", "d", "e"], answer_indexes: [3, 0, 3] })
    expect(item).toMatchObject({ type: "multiple", answers: ["a", "d"], bonne_reponse: "a ; d" })
  })

  it("rejects a multiple-answer question with one right answer or all of them", () => {
    const base = { type: "multiple", question: "Q", options: ["a", "b", "c", "d"] }
    expect(() => one({ ...base, answer_indexes: [1] })).toThrow(/no usable/)
    expect(() => one({ ...base, answer_indexes: [0, 1, 2, 3] })).toThrow(/no usable/)
    expect(() => one({ ...base, answer_indexes: [0, 9] })).toThrow(/no usable/)
  })

  it("reads true / false as canonical options", () => {
    const [item] = one({ type: "true_false", question: "TCP is reliable.", answer: true })
    expect(item).toMatchObject({ options: ["true", "false"], answers: ["true"] })
    expect(() => one({ type: "true_false", question: "S", answer: "true" })).toThrow(/no usable/)
  })

  it("reads short answers and cloze sentences with one blank", () => {
    expect(one({ type: "short", question: "Port of HTTPS?", answers: ["443"] })[0]).toMatchObject({ options: [], answers: ["443"] })
    expect(one({ type: "cloze", question: "Routers work at layer ___.", answers: ["3", "three"] })[0].answers).toEqual(["3", "three"])
    expect(() => one({ type: "cloze", question: "No blank here", answers: ["x"] })).toThrow(/no usable/)
    expect(() => one({ type: "cloze", question: "___ and ___", answers: ["x"] })).toThrow(/no usable/)
    expect(() => one({ type: "short", question: "Q", answers: [] })).toThrow(/no usable/)
  })

  it("reads an ordering question, keeping the right order", () => {
    const [item] = one({ type: "order", question: "Order the layers", items: ["Physical", "Data link", "Network"] })
    expect(item).toMatchObject({ type: "order", options: ["Physical", "Data link", "Network"], bonne_reponse: "Physical → Data link → Network" })
    expect(() => one({ type: "order", question: "Q", items: ["a", "b"] })).toThrow(/no usable/)
  })

  it("rejects an unknown type", () => {
    expect(() => one({ type: "essay", question: "Q" })).toThrow(/no usable/)
  })
})

describe("parseQuiz passages", () => {
  const passageText = "A company network has two sites linked by a VPN. Users at site B report slow access."
  const raw = JSON.stringify({
    questions: [valid],
    passages: [
      {
        text: passageText,
        questions: [
          { type: "true_false", question: "The sites are linked by a VPN.", answer: true },
          { type: "order", question: "Order", items: ["a", "b", "c"] }, // not allowed in a passage
          { type: "short", question: "Which site is slow?", answers: ["B"] },
        ],
      },
      { text: "too short", questions: [valid] },
    ],
  })

  it("attaches the passage text to its questions, without ordering questions", () => {
    const items = parseQuiz(raw)
    expect(items).toHaveLength(3)
    expect(items.filter((i) => i.passage === passageText).map((i) => i.type)).toEqual(["true_false", "short"])
  })
})

describe("limitQuestions", () => {
  const q = (id: string, passage?: string) => ({
    type: "single" as const, question: id, options: [], answers: [], bonne_reponse: "", explication: "", passage,
  })

  it("keeps a passage group whole and fills the rest with standalone questions", () => {
    const items = [q("s1"), q("s2"), q("s3"), q("s4"), q("p1", "P"), q("p2", "P")]
    expect(limitQuestions(items, 4).map((i) => i.question)).toEqual(["s1", "s2", "p1", "p2"])
  })

  it("keeps at least one group even when it is larger than half", () => {
    const items = [q("s1"), q("p1", "P"), q("p2", "P"), q("p3", "P")]
    expect(limitQuestions(items, 4).map((i) => i.question)).toEqual(["s1", "p1", "p2", "p3"])
  })

  it("does not add a second group beyond half of n", () => {
    const items = [q("s1"), q("s2"), q("s3"), q("p1", "P"), q("p2", "P"), q("r1", "R"), q("r2", "R")]
    expect(limitQuestions(items, 6).map((i) => i.question)).toEqual(["s1", "s2", "s3", "p1", "p2"])
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
