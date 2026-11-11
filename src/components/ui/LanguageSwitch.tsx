import { useT, type Lang } from "@/lib/i18n"

const LABELS: Record<Lang, string> = { fr: "FR", en: "EN" }

/** FR | EN toggle. */
export default function LanguageSwitch({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useT()
  return (
    <div
      role="radiogroup"
      aria-label={t("Language")}
      className={`inline-flex p-0.5 rounded-lg bg-white/[0.04] border border-white/10 ${className}`}
    >
      {(Object.keys(LABELS) as Lang[]).map((l) => (
        <button
          key={l}
          role="radio"
          aria-checked={lang === l}
          onClick={() => setLang(l)}
          className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors ${
            lang === l ? "bg-white/15 text-white" : "text-white/40 hover:text-white/80"
          }`}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  )
}
