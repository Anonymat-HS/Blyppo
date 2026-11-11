import type { LLMProvider } from "../types.ts"

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
const MAX_ATTEMPTS = 3
// Groq retires models regularly: override with the GROQ_MODEL secret when this one disappears.
const DEFAULT_MODEL = "openai/gpt-oss-120b"
// The free tier allows 8000 tokens per minute: prompt + max_tokens must stay under it.
const MAX_OUTPUT_TOKENS = 3500

export const groqProvider: LLMProvider = {
  async complete(prompt: string): Promise<string> {
    const apiKey = Deno.env.get("GROQ_API_KEY")
    if (!apiKey) throw new Error("GROQ_API_KEY not set")
    const model = Deno.env.get("GROQ_MODEL") ?? DEFAULT_MODEL
    // gpt-oss models "think" before answering; keep that short so the answer fits
    const reasoning = model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : {}

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const res = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: MAX_OUTPUT_TOKENS,
          response_format: { type: "json_object" },
          ...reasoning,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        return data.choices?.[0]?.message?.content ?? ""
      }

      const errBody = await res.text()

      if (res.status === 429 && attempt < MAX_ATTEMPTS - 1) {
        const match = errBody.match(/try again in ([\d.]+)s/)
        const waitSec = match ? Math.ceil(parseFloat(match[1])) + 1 : 30
        await new Promise((r) => setTimeout(r, waitSec * 1000))
        continue
      }

      throw new Error(`Groq API error: ${res.status} - ${errBody}`)
    }

    throw new Error("Groq API error: max retries exceeded")
  },
}
