import type { GeneratedFlashcard, GeneratedQuizItem, LLMProvider } from "./types.ts"
import { geminiProvider } from "./providers/gemini.ts"
import { groqProvider } from "./providers/groq.ts"
import { ollamaProvider } from "./providers/ollama.ts"
import { flashcardPrompt, quizPrompt } from "./prompts.ts"
import { parseFlashcards, parseQuiz } from "./parse.ts"
import { sampleText } from "./text.ts"

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

export async function generateQuiz(courseText: string, n: number): Promise<GeneratedQuizItem[]> {
  const raw = await getLLMProvider().complete(quizPrompt(n, sampleText(courseText)))
  return parseQuiz(raw).slice(0, n)
}

export async function generateFlashcards(
  courseText: string,
  n: number
): Promise<GeneratedFlashcard[]> {
  const raw = await getLLMProvider().complete(flashcardPrompt(n, sampleText(courseText)))
  return parseFlashcards(raw).slice(0, n)
}
