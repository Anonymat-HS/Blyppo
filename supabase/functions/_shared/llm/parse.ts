import type { GeneratedFlashcard, GeneratedQuizItem } from "./types.ts"

/** Extracts the array stored under `key` (or a bare array) from the LLM answer. */
function extractArray(raw: string, key: string): unknown[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    // Some models wrap the JSON in prose or a code fence: keep the outermost {...} or [...]
    const match = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
    if (!match) throw new Error("LLM response is not valid JSON")
    try {
      parsed = JSON.parse(match[0])
    } catch {
      throw new Error("LLM response is not valid JSON")
    }
  }

  if (Array.isArray(parsed)) return parsed
  const value = (parsed as Record<string, unknown> | null)?.[key]
  if (Array.isArray(value)) return value
  throw new Error(`LLM response has no "${key}" array`)
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

/** Keeps only well-formed questions; the stored answer is always one of the options. */
export function parseQuiz(raw: string): GeneratedQuizItem[] {
  const items: GeneratedQuizItem[] = []
  for (const entry of extractArray(raw, "questions")) {
    const q = entry as Record<string, unknown>
    const question = text(q?.question)
    const options = Array.isArray(q?.options) ? q.options.map(text) : []
    const index = q?.bonne_reponse_index

    const distinct = new Set(options.map((o) => o.toLowerCase())).size
    if (!question || options.length !== 4 || options.some((o) => !o) || distinct !== 4) continue
    if (typeof index !== "number" || !Number.isInteger(index) || index < 0 || index > 3) continue

    items.push({
      question,
      options,
      bonne_reponse: options[index],
      explication: text(q.explication),
    })
  }
  if (!items.length) throw new Error("LLM returned no usable quiz question")
  return items
}

export function parseFlashcards(raw: string): GeneratedFlashcard[] {
  const cards: GeneratedFlashcard[] = []
  for (const entry of extractArray(raw, "flashcards")) {
    const c = entry as Record<string, unknown>
    const recto = text(c?.recto)
    const verso = text(c?.verso)
    if (recto && verso) cards.push({ recto, verso })
  }
  if (!cards.length) throw new Error("LLM returned no usable flashcard")
  return cards
}
