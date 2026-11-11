// About 4000 tokens of French course text, which leaves room for the answer
// under Groq's free limit of 8000 tokens per minute.
const DEFAULT_MAX_WORDS = 2200
const SECTIONS = 8

function maxWords(): number {
  const fromEnv = parseInt(Deno.env.get("LLM_MAX_INPUT_WORDS") ?? "", 10)
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_MAX_WORDS
}

/**
 * Keeps the prompt under the word budget. A long course is cut into equal
 * sections and the start of each one is kept, so every part of the course
 * (not only its introduction and conclusion) can produce questions.
 */
export function sampleText(text: string, budget = maxWords()): string {
  const words = text.trim().split(/\s+/)
  if (words.length <= budget) return text.trim()

  const sectionSize = Math.ceil(words.length / SECTIONS)
  const perSection = Math.floor(budget / SECTIONS)
  const excerpts: string[] = []
  for (let i = 0; i < SECTIONS; i++) {
    const start = i * sectionSize
    excerpts.push(words.slice(start, start + perSection).join(" "))
  }
  return excerpts.join("\n\n[...]\n\n")
}
