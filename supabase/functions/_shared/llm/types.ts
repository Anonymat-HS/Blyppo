/**
 * Question types (quizzes.type):
 * - single      4 options, one right (answers = [option])
 * - multiple    4-5 options, 2-3 right (answers = the right options)
 * - true_false  a statement; options = ["true", "false"], answers = ["true"] or ["false"]
 * - short       typed answer; answers = accepted spellings, options = []
 * - cloze       sentence with one "___" blank; answers = accepted words, options = []
 * - order       options = the items IN THE RIGHT ORDER (the app shuffles them), answers = same
 */
export type QuestionType = "single" | "multiple" | "true_false" | "short" | "cloze" | "order"

export interface GeneratedQuizItem {
  type: QuestionType
  question: string
  options: string[]
  answers: string[]
  /** Readable right answer, also used by older app versions */
  bonne_reponse: string
  explication: string
  /** Text the question is about (a passage, a case study); questions sharing it are played together */
  passage?: string
}

export interface GeneratedFlashcard {
  recto: string
  verso: string
}

/**
 * A provider only knows how to send a prompt and return the raw text answer.
 * Prompts, text sampling and output validation are shared (see index.ts), so
 * adding a provider means implementing this single function.
 * The model is always asked for a JSON object.
 */
export interface LLMProvider {
  complete(prompt: string): Promise<string>
}
