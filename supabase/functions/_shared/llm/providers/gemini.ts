import type { LLMProvider } from "../types.ts"

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"

export const geminiProvider: LLMProvider = {
  async complete(prompt: string): Promise<string> {
    const apiKey = Deno.env.get("GEMINI_API_KEY")
    if (!apiKey) throw new Error("GEMINI_API_KEY not set")
    const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.0-flash"

    const res = await fetch(`${GEMINI_API_BASE}/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4000,
          responseMimeType: "application/json",
        },
      }),
    })

    if (!res.ok) {
      throw new Error(`Gemini API error: ${res.status} - ${await res.text()}`)
    }

    const data = await res.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
  },
}
