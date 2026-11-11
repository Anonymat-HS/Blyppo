export interface GeneratedQuizItem {
  question: string
  options: string[]
  bonne_reponse: string
  explication: string
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
