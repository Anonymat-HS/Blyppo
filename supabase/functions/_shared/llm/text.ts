// About 4000 tokens of French course text, which leaves room for the answer
// under Groq's free limit of 8000 tokens per minute.
const DEFAULT_MAX_WORDS = 2200
const SECTIONS = 8

export function maxWords(): number {
  const fromEnv = parseInt(Deno.env.get("LLM_MAX_INPUT_WORDS") ?? "", 10)
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_MAX_WORDS
}

/**
 * Keeps the prompt under the word budget. A long course is cut into equal
 * sections and an excerpt of each one is kept, so every part of the course
 * (not only its introduction and conclusion) can produce questions.
 * Round 1 takes the start of each section; each later round moves the excerpt
 * further into the section, so new questions come from new material.
 */
export function sampleText(text: string, budget = maxWords(), round = 1): string {
  const words = text.trim().split(/\s+/)
  if (words.length <= budget) return text.trim()

  const sectionSize = Math.ceil(words.length / SECTIONS)
  const perSection = Math.max(1, Math.floor(budget / SECTIONS))
  const excerpts: string[] = []
  for (let i = 0; i < SECTIONS; i++) {
    const start = i * sectionSize
    const offset = ((Math.max(1, round) - 1) * perSection) % sectionSize
    const end = Math.min(start + offset + perSection, start + sectionSize)
    excerpts.push(words.slice(start + offset, end).join(" "))
  }
  return excerpts.join("\n\n[...]\n\n")
}

/** Most recent items, shortened, so the list stays a small part of the prompt. */
const AVOID_ITEMS = 30
const AVOID_CHARS = 140

export function avoidList(existing: string[] = []): string[] {
  return existing
    .slice(-AVOID_ITEMS)
    .map((t) => t.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((t) => (t.length > AVOID_CHARS ? t.slice(0, AVOID_CHARS - 1) + "…" : t))
}
