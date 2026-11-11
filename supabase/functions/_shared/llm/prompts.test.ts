import { describe, expect, it } from "vitest"
import { avoidRule, flashcardPrompt, quizPrompt } from "./prompts"

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
