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
