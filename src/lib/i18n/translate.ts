import common from "./fr/common"
import auth from "./fr/auth"
import landing from "./fr/landing"
import app from "./fr/app"
import study from "./fr/study"
import stats from "./fr/stats"

export type Lang = "fr" | "en"
export const LANGS: Lang[] = ["fr", "en"]
export type Vars = Record<string, string | number>

/** French dictionary. The English text written in the code is both the key and the English version. */
export const FR: Record<string, string> = { ...common, ...auth, ...landing, ...app, ...study, ...stats }

/**
 * Text in the given language. `{name}` placeholders are filled from `vars`.
 * A key missing from the French dictionary falls back to English.
 */
export function translate(lang: Lang, key: string, vars?: Vars): string {
  const text = lang === "fr" ? (FR[key] ?? key) : key
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match
  )
}

/** Locale for dates and numbers. */
export function localeOf(lang: Lang): string {
  return lang === "fr" ? "fr-FR" : "en-US"
}
