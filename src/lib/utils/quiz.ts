import type { QuizQuestion } from "@/lib/types"

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

function shuffled<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Prepares questions for a quiz session: drops those that cannot be graded,
 * stores the correct answer as the exact option text, and shuffles the options
 * so the right answer is not always at the position the LLM chose.
 */
export function prepareQuestions(questions: QuizQuestion[]): QuizQuestion[] {
  const prepared: QuizQuestion[] = []
  for (const q of questions) {
    const idx = findCorrectIndex(q)
    if (idx === -1) continue
    prepared.push({ ...q, bonne_reponse: q.options[idx], options: shuffled(q.options) })
  }
  return prepared
}
