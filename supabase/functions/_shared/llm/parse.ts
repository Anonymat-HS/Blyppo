import type { GeneratedFlashcard, GeneratedQuizItem, QuestionType } from "./types.ts"

/** Parses the LLM answer as JSON, unwrapping prose or a code fence around it. */
function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    // Some models wrap the JSON in prose or a code fence: keep the outermost {...} or [...]
    const match = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
    if (!match) throw new Error("LLM response is not valid JSON")
    try {
      return JSON.parse(match[0])
    } catch {
      throw new Error("LLM response is not valid JSON")
    }
  }
}

/** The array stored under `key` of an object, or the value itself when it is an array. */
function arrayAt(parsed: unknown, key: string): unknown[] | null {
  if (Array.isArray(parsed)) return parsed
  const value = (parsed as Record<string, unknown> | null)?.[key]
  return Array.isArray(value) ? value : null
}

/** Extracts the array stored under `key` (or a bare array) from the LLM answer. */
function extractArray(raw: string, key: string): unknown[] {
  const value = arrayAt(parseJson(raw), key)
  if (!value) throw new Error(`LLM response has no "${key}" array`)
  return value
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function textList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(text) : []
}

function distinct(items: string[]): boolean {
  return new Set(items.map((i) => i.toLowerCase())).size === items.length
}

function isIndex(value: unknown, length: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < length
}

const MAX_PASSAGE_CHARS = 2000

/**
 * One question of any type, validated. Returns null when it is malformed, so a
 * bad entry is dropped instead of being stored.
 */
function parseQuestion(entry: unknown): GeneratedQuizItem | null {
  const q = (entry ?? {}) as Record<string, unknown>
  const question = text(q.question)
  const explication = text(q.explication)
  if (!question) return null
  // Older prompt format: no type, bonne_reponse_index
  const type = (text(q.type) || "single") as QuestionType

  switch (type) {
    case "single": {
      const options = textList(q.options)
      const index = q.answer_index ?? q.bonne_reponse_index
      if (options.length !== 4 || options.some((o) => !o) || !distinct(options)) return null
      if (!isIndex(index, 4)) return null
      return { type, question, options, answers: [options[index]], bonne_reponse: options[index], explication }
    }
    case "multiple": {
      const options = textList(q.options)
      const raw = Array.isArray(q.answer_indexes) ? q.answer_indexes : []
      if (options.length < 4 || options.length > 5 || options.some((o) => !o) || !distinct(options)) return null
      if (!raw.every((i) => isIndex(i, options.length))) return null
      const indexes = [...new Set(raw as number[])].sort((a, b) => a - b)
      // At least two right answers, and at least one wrong option
      if (indexes.length < 2 || indexes.length >= options.length) return null
      const answers = indexes.map((i) => options[i])
      return { type, question, options, answers, bonne_reponse: answers.join(" ; "), explication }
    }
    case "true_false": {
      if (typeof q.answer !== "boolean") return null
      const answer = q.answer ? "true" : "false"
      return { type, question, options: ["true", "false"], answers: [answer], bonne_reponse: answer, explication }
    }
    case "short":
    case "cloze": {
      const answers = textList(q.answers).filter(Boolean)
      if (!answers.length || answers.length > 5 || answers.some((a) => a.length > 80)) return null
      if (type === "cloze" && question.split("___").length !== 2) return null
      return { type, question, options: [], answers, bonne_reponse: answers[0], explication }
    }
    case "order": {
      const items = textList(q.items)
      if (items.length < 3 || items.length > 6 || items.some((i) => !i) || !distinct(items)) return null
      return { type, question, options: items, answers: items, bonne_reponse: items.join(" → "), explication }
    }
    default:
      return null
  }
}

/**
 * Keeps only well-formed questions of the supported types. Questions about a
 * passage come right after each other and carry its text; a passage keeps at
 * least one valid question, or is dropped.
 */
export function parseQuiz(raw: string): GeneratedQuizItem[] {
  const parsed = parseJson(raw)
  const questions = arrayAt(parsed, "questions")
  const passages = Array.isArray(parsed) ? [] : arrayAt(parsed, "passages") ?? []
  if (!questions && !passages.length) throw new Error(`LLM response has no "questions" array`)

  const items: GeneratedQuizItem[] = []
  for (const entry of questions ?? []) {
    const item = parseQuestion(entry)
    if (item) items.push(item)
  }

  for (const entry of passages) {
    const p = (entry ?? {}) as Record<string, unknown>
    const passage = text(p.text).slice(0, MAX_PASSAGE_CHARS)
    if (passage.length < 40) continue
    const group = (Array.isArray(p.questions) ? p.questions : [])
      .map(parseQuestion)
      // A passage question must stand on the passage: keep the simple types
      .filter((item): item is GeneratedQuizItem => item !== null && item.type !== "order")
    for (const item of group) items.push({ ...item, passage })
  }

  if (!items.length) throw new Error("LLM returned no usable quiz question")
  return items
}

/**
 * Keeps about `n` questions. Passage groups are kept whole and take at most half
 * of `n` (but at least one group when there is one); standalone questions fill
 * the rest. Order: standalone questions, then the passage groups.
 */
export function limitQuestions(items: GeneratedQuizItem[], n: number): GeneratedQuizItem[] {
  const standalone = items.filter((i) => i.passage === undefined)
  const groups: GeneratedQuizItem[][] = []
  for (const item of items) {
    if (item.passage === undefined) continue
    const last = groups.at(-1)
    if (last && last[0].passage === item.passage) last.push(item)
    else groups.push([item])
  }

  const kept: GeneratedQuizItem[] = []
  for (const group of groups) {
    if (kept.length && kept.length + group.length > Math.floor(n / 2)) break
    kept.push(...group)
  }
  return [...standalone.slice(0, Math.max(0, n - kept.length)), ...kept]
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
