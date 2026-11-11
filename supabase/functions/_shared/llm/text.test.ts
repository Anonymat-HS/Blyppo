import { describe, it, expect, afterEach, vi } from "vitest"
import { avoidList, sampleText } from "./text"

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

describe("sampleText rounds", () => {
  const text = words(800).join(" ") // 100 words per section, 10 kept per section

  it("round 1 reads the start of each section, like before", () => {
    expect(sampleText(text, 80, 1)).toBe(sampleText(text, 80))
  })

  it("a later round reads further into each section", () => {
    const round2 = sampleText(text, 80, 2)
    expect(round2).toContain("w10") // section 1, second excerpt
    expect(round2).toContain("w410") // section 5, second excerpt
    expect(round2.split(/\s+/)).not.toContain("w0")
  })

  it("stays inside the section and under the budget", () => {
    const round10 = sampleText(text, 80, 10)
    expect(round10).toContain("w90")
    expect(round10.split(/\s+/)).not.toContain("w100")
    expect(round10.split(/\s+/).filter((w) => w !== "[...]").length).toBeLessThanOrEqual(80)
  })

  it("wraps around once every part of a section has been used", () => {
    expect(sampleText(text, 80, 11)).toBe(sampleText(text, 80, 1))
  })
})

describe("avoidList", () => {
  it("keeps the 30 most recent items", () => {
    const items = Array.from({ length: 40 }, (_, i) => `Question ${i}`)
    const list = avoidList(items)
    expect(list).toHaveLength(30)
    expect(list[0]).toBe("Question 10")
    expect(list[29]).toBe("Question 39")
  })

  it("collapses whitespace, drops blanks and shortens long items", () => {
    const list = avoidList(["  What   is\nTCP? ", "   ", "x".repeat(300)])
    expect(list[0]).toBe("What is TCP?")
    expect(list).toHaveLength(2)
    expect(list[1].length).toBe(140)
    expect(list[1].endsWith("…")).toBe(true)
  })
})
