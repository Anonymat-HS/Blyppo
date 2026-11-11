import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { LANGS, localeOf, translate, type Lang, type Vars } from "./translate"

export type { Lang } from "./translate"

const KEY = "blyppo.lang"
/** Key used when the app was called Kwizo: still read, so nobody loses their setting */
const OLD_KEY = "kwizo.lang"
/** Blyppo speaks French first: most of its students are French speakers. */
const DEFAULT_LANG: Lang = "fr"

function savedLang(): Lang {
  try {
    const saved = (localStorage.getItem(KEY) ?? localStorage.getItem(OLD_KEY))
    return LANGS.includes(saved as Lang) ? (saved as Lang) : DEFAULT_LANG
  } catch {
    return DEFAULT_LANG
  }
}

interface I18n {
  lang: Lang
  setLang: (lang: Lang) => void
  /** Translates an English text: t("Play again"), t("{n} questions", { n: 3 }) */
  t: (key: string, vars?: Vars) => string
  /** "fr-FR" / "en-US", for toLocaleDateString and friends */
  locale: string
}

const I18nContext = createContext<I18n | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(savedLang)

  useEffect(() => {
    document.documentElement.lang = lang
    document.title = translate(lang, "Blyppo · Quiz yourself, ace the exam")
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // Not remembered, still applied for this visit
    }
  }, [])

  const value = useMemo<I18n>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => translate(lang, key, vars),
      locale: localeOf(lang),
    }),
    [lang, setLang]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

/** Current language and the translate function. Outside the provider, English. */
export function useT(): I18n {
  return (
    useContext(I18nContext) ?? {
      lang: "en",
      setLang: () => {},
      t: (key, vars) => translate("en", key, vars),
      locale: localeOf("en"),
    }
  )
}
