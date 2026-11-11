import type { QuestionType, QuizQuestion } from "@/lib/types"

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ")
}

/**
 * Index of the correct option, or -1 when it cannot be identified with certainty.
 * New questions store the exact text of the option. Older ones may store a
 * letter ("B", "B) ...") or a reworded answer, handled as fallbacks.
 */
export function findCorrectIndex(q: Pick<QuizQuestion, "options" | "bonne_reponse">): number {
  const target = normalize(q.bonne_reponse)
  const options = q.options.map(normalize)

  const exact = options.indexOf(target)
  if (exact !== -1) return exact

  const letter = target.match(/^([a-d])(?:[).:\s]|$)/)
  if (letter) {
    const idx = letter[1].charCodeAt(0) - 97
    if (idx < options.length) return idx
  }

  // Reworded answer: accept only if it points to a single option
  const partial = options
    .map((opt, idx) => (target.includes(opt) || opt.includes(target) ? idx : -1))
    .filter((idx) => idx !== -1)
  return partial.length === 1 ? partial[0] : -1
}

export function shuffled<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** The question's type; rows created before question types are single-answer. */
export function typeOf(q: Pick<QuizQuestion, "type">): QuestionType {
  return q.type ?? "single"
}

/** Types answered by picking options (as opposed to typing or ordering). */
export function isChoice(type: QuestionType): boolean {
  return type === "single" || type === "multiple" || type === "true_false"
}

/** Items in a new order, different from the given one whenever possible. */
function scrambled(items: string[]): string[] {
  for (let tries = 0; tries < 10; tries++) {
    const order = shuffled(items)
    if (order.some((item, i) => item !== items[i])) return order
  }
  return [...items].reverse()
}

/**
 * Prepares questions for a quiz session: drops those that cannot be graded,
 * fills `answers` for older single-answer rows, and shuffles options (and the
 * items to put in order) so the right answer is not always where the LLM put it.
 * True / false keeps its order.
 */
export function prepareQuestions(questions: QuizQuestion[]): QuizQuestion[] {
  const prepared: QuizQuestion[] = []
  for (const q of questions) {
    const type = typeOf(q)
    const answers = (q.answers ?? []).filter((a) => typeof a === "string" && a.trim())

    if (type === "single") {
      const idx = answers.length ? q.options.indexOf(answers[0]) : findCorrectIndex(q)
      if (idx === -1) continue
      const right = q.options[idx]
      prepared.push({ ...q, type, answers: [right], bonne_reponse: right, options: shuffled(q.options) })
    } else if (type === "multiple") {
      if (answers.length < 2 || !answers.every((a) => q.options.includes(a))) continue
      prepared.push({ ...q, type, answers, options: shuffled(q.options) })
    } else if (type === "true_false") {
      if (answers.length !== 1 || !["true", "false"].includes(answers[0])) continue
      prepared.push({ ...q, type, answers, options: ["true", "false"] })
    } else if (type === "short" || type === "cloze") {
      if (!answers.length) continue
      prepared.push({ ...q, type, answers, options: [] })
    } else if (type === "order") {
      if (answers.length < 3) continue
      prepared.push({ ...q, type, answers, options: scrambled(answers) })
    }
  }
  return prepared
}

/** What the student answered. */
export type QuizResponse =
  | { kind: "choice"; picked: number[] }
  | { kind: "text"; value: string }
  | { kind: "order"; sequence: string[] }

/** Lowercase, no accents, no punctuation, no leading article, single spaces. */
export function normalizeTyped(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/^(le|la|les|l|un|une|des|du|de|d|the|a|an) /, "")
}

/** Number of single-character edits between two strings. */
export function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const current = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = current
    }
  }
  return row[b.length]
}

/**
 * Whether a typed answer matches one of the accepted ones. Case, accents,
 * punctuation and a leading article do not matter, and small typos are
 * forgiven on words (1 letter up to 8 letters, 2 beyond). Anything with a
 * number must match exactly.
 */
export function matchesTyped(value: string, accepted: string[]): boolean {
  const typed = normalizeTyped(value)
  if (!typed) return false
  return accepted.some((answer) => {
    const target = normalizeTyped(answer)
    if (!target) return false
    if (typed === target) return true
    if (/\d/.test(target) || /\d/.test(typed)) return false
    const allowed = target.length <= 4 ? 0 : target.length <= 8 ? 1 : 2
    return levenshtein(typed, target) <= allowed
  })
}

/** Whether a response is right. `q` must come from prepareQuestions. */
export function grade(q: QuizQuestion, response: QuizResponse): boolean {
  const type = typeOf(q)
  const answers = q.answers ?? []
  if (isChoice(type)) {
    if (response.kind !== "choice") return false
    const picked = new Set(response.picked.map((i) => q.options[i]))
    return picked.size === answers.length && answers.every((a) => picked.has(a))
  }
  if (type === "order") {
    return response.kind === "order" &&
      response.sequence.length === answers.length &&
      response.sequence.every((item, i) => item === answers[i])
  }
  return response.kind === "text" && matchesTyped(response.value, answers)
}

/** Questions per quiz session */
export const SESSION_SIZE = 10

/**
 * Picks the questions of a session from every question of the course(s):
 * never answered first, then the ones last answered wrong, then the ones
 * already known, at random within each group. Questions about the same
 * passage are picked and played together (they count as several questions).
 * The groups are shuffled again so the new questions are not always first.
 * `lastCorrect` holds the latest answer to each question id (absent = never answered).
 */
export function pickSession<T extends { id: string; passage?: { id: string } | null }>(
  questions: T[],
  lastCorrect: Record<string, boolean>,
  size = SESSION_SIZE
): T[] {
  const priority = (q: T) => (!(q.id in lastCorrect) ? 0 : lastCorrect[q.id] === false ? 1 : 2)

  // A unit is one standalone question, or every question of one passage
  const units: T[][] = []
  const byPassage = new Map<string, T[]>()
  for (const q of questions) {
    const passageId = q.passage?.id
    if (!passageId) {
      units.push([q])
      continue
    }
    const group = byPassage.get(passageId)
    if (group) group.push(q)
    else {
      const created = [q]
      byPassage.set(passageId, created)
      units.push(created)
    }
  }

  const unitPriority = (unit: T[]) => Math.min(...unit.map(priority))
  const ordered = [0, 1, 2].flatMap((p) => shuffled(units.filter((u) => unitPriority(u) === p)))

  const picked: T[][] = []
  let count = 0
  for (const unit of ordered) {
    if (count >= size) break
    // A passage that does not fit is skipped, unless nothing was picked yet
    if (count + unit.length > size && count > 0) continue
    picked.push(unit)
    count += unit.length
  }
  return shuffled(picked).flat()
}
