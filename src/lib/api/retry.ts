export interface QueryLike {
  then(onfulfilled: (value: { data: unknown; error: unknown }) => unknown): unknown
}

/**
 * Runs a Supabase read up to `attempts` times.
 * Throws when every attempt fails, so callers can tell "no rows" from "request failed".
 */
export async function retryQuery<T>(query: QueryLike, attempts = 3): Promise<T[]> {
  let lastError: unknown = null
  for (let attempt = 0; attempt < attempts; attempt++) {
    const res = (await query.then((v) => v)) as { data: T[] | null; error: unknown }
    if (!res.error) return res.data ?? []
    lastError = res.error
    if (attempt < attempts - 1) {
      await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)))
    }
  }
  const message = (lastError as { message?: string } | null)?.message
  throw new Error(message || "Could not reach the server. Check your connection and try again.")
}
