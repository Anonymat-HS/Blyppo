import type { GeneratedFlashcard, GeneratedQuizItem, LLMProvider } from "./types.ts"
import { geminiProvider } from "./providers/gemini.ts"
import { groqProvider } from "./providers/groq.ts"
import { ollamaProvider } from "./providers/ollama.ts"
import { flashcardPrompt, quizPrompt } from "./prompts.ts"
import { limitQuestions, parseFlashcards, parseQuiz } from "./parse.ts"
import { avoidList, maxWords, sampleText } from "./text.ts"

export type { GeneratedFlashcard, GeneratedQuizItem, LLMProvider } from "./types.ts"

const providers: Record<string, LLMProvider> = {
  gemini: geminiProvider,
  groq: groqProvider,
  ollama: ollamaProvider,
}

/** Active provider, chosen with the LLM_PROVIDER secret (gemini | groq | ollama). */
export function getLLMProvider(): LLMProvider {
  const name = Deno.env.get("LLM_PROVIDER") ?? "groq"
  const provider = providers[name]
  if (!provider) {
    throw new Error(
      `Unknown LLM provider "${name}". Available: ${Object.keys(providers).join(", ")}`
    )
  }
  return provider
}

export interface RoundOptions {
  /** Generation round (1 at upload); later rounds read other parts of a long course */
  round?: number
  /** Questions or card fronts the course already has */
  avoid?: string[]
}

/** Course-text budget once the avoid list has taken its share of the prompt. */
function courseBudget(avoid: string[]): number {
  const avoidWords = avoid.join(" ").split(/\s+/).filter(Boolean).length
  return Math.max(500, maxWords() - avoidWords)
}

export async function generateQuiz(
  courseText: string,
  n: number,
  { round = 1, avoid = [] }: RoundOptions = {}
): Promise<GeneratedQuizItem[]> {
  const list = avoidList(avoid)
  const text = sampleText(courseText, courseBudget(list), round)
  const raw = await getLLMProvider().complete(quizPrompt(n, text, list))
  return limitQuestions(parseQuiz(raw), n)
}

export async function generateFlashcards(
  courseText: string,
  n: number,
  { round = 1, avoid = [] }: RoundOptions = {}
): Promise<GeneratedFlashcard[]> {
  const list = avoidList(avoid)
  const text = sampleText(courseText, courseBudget(list), round)
  const raw = await getLLMProvider().complete(flashcardPrompt(n, text, list))
  return parseFlashcards(raw).slice(0, n)
}
