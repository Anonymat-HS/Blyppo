import { describe, expect, it } from "vitest"
import { avoidRule, flashcardPrompt, quizMix, quizPrompt } from "./prompts"

describe("avoidRule", () => {
  it("adds nothing for a first round", () => {
    expect(avoidRule([], "questions")).toBe("")
    expect(quizPrompt(5, "cours")).not.toContain("Ne reprends")
  })

  it("lists what the course already has", () => {
    const prompt = quizPrompt(5, "cours", ["Qu'est-ce que TCP ?", "Port HTTPS ?"])
    expect(prompt).toContain("Ne reprends AUCUNE de ces questions déjà posées")
    expect(prompt).toContain("• Qu'est-ce que TCP ?")
    expect(prompt).toContain("• Port HTTPS ?")
    // the JSON format instructions are still there, after the rule
    expect(prompt.indexOf("Ne reprends")).toBeLessThan(prompt.indexOf("Réponds UNIQUEMENT"))
  })

  it("works for flashcards too", () => {
    expect(flashcardPrompt(5, "cours", ["DNS"])).toContain("ces flashcards déjà créées")
  })
})

describe("quizMix", () => {
  const total = (m: ReturnType<typeof quizMix>) =>
    m.single + m.multiple + m.trueFalse + m.written + m.order + m.passageQuestions

  it("adds up to the requested number of questions", () => {
    for (const n of [3, 5, 10, 15, 20, 30]) expect(total(quizMix(n)), `n=${n}`).toBe(n)
  })

  it("asks for a passage from 6 questions, never for more than 3 passage questions", () => {
    expect(quizMix(5).passageQuestions).toBe(0)
    expect(quizMix(10).passageQuestions).toBe(2)
    expect(quizMix(30).passageQuestions).toBe(3)
  })

  it("keeps classic single-answer questions the largest group", () => {
    const m = quizMix(10)
    expect(m.single).toBeGreaterThanOrEqual(Math.max(m.multiple, m.trueFalse, m.written, m.order))
  })
})

describe("quizPrompt", () => {
  it("documents every question type", () => {
    const prompt = quizPrompt(10, "cours")
    for (const type of ["single", "multiple", "true_false", "short", "cloze", "order"]) {
      expect(prompt).toContain(`"type": "${type}"`)
    }
    expect(prompt).toContain('"passages"')
  })
})
