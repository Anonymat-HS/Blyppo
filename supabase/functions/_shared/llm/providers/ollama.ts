import type { LLMProvider } from "../types.ts"

export const ollamaProvider: LLMProvider = {
  async complete(prompt: string): Promise<string> {
    const baseUrl = Deno.env.get("OLLAMA_URL") ?? "http://localhost:11434"

    const res = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("OLLAMA_MODEL") ?? "llama3.1",
        prompt,
        stream: false,
        format: "json",
        options: { temperature: 0.7, num_predict: 4000 },
      }),
    })

    if (!res.ok) {
      throw new Error(`Ollama API error: ${res.status} - ${await res.text()}`)
    }

    const data = await res.json()
    return data.response ?? ""
  },
}
