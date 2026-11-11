import { describe, it, expect, afterEach, vi } from "vitest"
import { sampleText } from "./text"

const words = (n: number, prefix = "w") => Array.from({ length: n }, (_, i) => `${prefix}${i}`)

describe("sampleText", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns a short text untouched, trimmed", () => {
    expect(sampleText("  hello world ", 10)).toBe("hello world")
  })

  it("brings a long text under the budget", () => {
    const text = words(2000).join(" ")
    const sampled = sampleText(text, 200)
    // 8 sections of 25 words, plus the [...\n\n separators
    expect(sampled.split(/\s+/).filter((w) => w !== "[...]")).toHaveLength(200)
    expect(sampled.length).toBeLessThan(text.length)
  })

  it("keeps the middle and the end of the course, not just the start", () => {
    const text = words(800).join(" ") // 100 words per section
    const sampled = sampleText(text, 80) // 10 per section
    expect(sampled).toContain("w0") // start of section 1
    expect(sampled).toContain("w400") // start of section 5
    expect(sampled).toContain("w700") // start of section 8
  })

  it("still returns something when the budget is smaller than a section", () => {
    const text = words(100).join(" ")
    const sampled = sampleText(text, 4)
    expect(sampled.split(/\s+/).filter((w) => w !== "[...]")).toHaveLength(8)
  })

  it("reads LLM_MAX_INPUT_WORDS when no budget is given", () => {
    vi.stubGlobal("Deno", { env: { get: () => "50" } })
    const sampled = sampleText(words(500).join(" "))
    const count = sampled.split(/\s+/).filter((w) => w !== "[...]").length
    expect(count).toBeGreaterThan(0)
    expect(count).toBeLessThanOrEqual(50) // 8 sections, rounded down
  })

  it("falls back to the built-in budget on an invalid setting", () => {
    vi.stubGlobal("Deno", { env: { get: () => "not-a-number" } })
    const text = words(2500).join(" ")
    // default is 2200 words: the text is sampled, not returned whole
    expect(sampleText(text)).not.toBe(text)
  })
})
