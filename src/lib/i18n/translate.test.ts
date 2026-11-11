import { describe, expect, it } from "vitest"
import { FR, translate } from "./translate"

describe("translate", () => {
  it("returns the English text as-is in English", () => {
    expect(translate("en", "Play again")).toBe("Play again")
  })

  it("falls back to English for a missing French entry", () => {
    expect(translate("fr", "A text nobody translated")).toBe("A text nobody translated")
  })

  it("fills placeholders", () => {
    expect(translate("en", "{n} questions in {course}", { n: 3, course: "Java" })).toBe("3 questions in Java")
  })

  it("leaves an unknown placeholder visible", () => {
    expect(translate("en", "Hello {name}")).toBe("Hello {name}")
  })
})

describe("French dictionary", () => {
  const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",")

  it("keeps the same placeholders as the English text", () => {
    for (const [en, fr] of Object.entries(FR)) {
      expect(placeholders(fr), `"${en}"`).toBe(placeholders(en))
    }
  })

  it("has no empty translation", () => {
    for (const [en, fr] of Object.entries(FR)) expect(fr.trim(), `"${en}"`).not.toBe("")
  })
})
