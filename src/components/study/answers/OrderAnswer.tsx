import { useEffect, useState } from "react"
import { CheckCircle, RotateCcw, Undo2, XCircle } from "lucide-react"
import type { QuizQuestion } from "@/lib/types"
import type { QuizResponse } from "@/lib/utils/quiz"
import { useT } from "@/lib/i18n"
import { primaryButton } from "@/components/ui/PageStates"

/**
 * Put items in order by tapping them in sequence (works on a phone, no drag).
 * Keys 1-6 pick an item, Backspace undoes, Enter validates.
 */
export default function OrderAnswer({
  q,
  result,
  onSubmit,
}: {
  q: QuizQuestion
  result: QuizResponse | null
  onSubmit: (response: QuizResponse) => void
}) {
  const { t } = useT()
  const [sequence, setSequence] = useState<string[]>([])
  const revealed = result !== null
  const placed = result?.kind === "order" ? result.sequence : sequence
  const remaining = q.options.filter((item) => !placed.includes(item))
  const answers = q.answers ?? []
  const complete = placed.length === q.options.length

  const add = (item: string) => !revealed && setSequence((s) => (s.includes(item) ? s : [...s, item]))
  const removeFrom = (index: number) => !revealed && setSequence((s) => s.slice(0, index))
  const validate = () => complete && !revealed && onSubmit({ kind: "order", sequence })

  useEffect(() => {
    if (revealed) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if ((e.target as HTMLElement).closest("input, textarea")) return
      const n = Number(e.key)
      if (Number.isInteger(n) && n >= 1 && n <= remaining.length) {
        e.preventDefault()
        add(remaining[n - 1])
      } else if (e.key === "Backspace") {
        e.preventDefault()
        setSequence((s) => s.slice(0, -1))
      } else if (e.key === "Enter" && !(e.target as HTMLElement).closest("button")) {
        e.preventDefault()
        validate()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  })

  return (
    <div className="mb-6">
      {/* The order being built */}
      <ol className="space-y-2 mb-4" aria-label={t("Your order")}>
        {q.options.map((_, slot) => {
          const item = placed[slot]
          const right = revealed && item === answers[slot]
          return (
            <li
              key={slot}
              className={`flex items-center gap-3 p-3 rounded-2xl border-2 min-h-[52px] transition-colors ${
                !item
                  ? "border-dashed border-white/10"
                  : revealed
                    ? right
                      ? "bg-ok/10 border-ok/45 text-[#BBF7D0]"
                      : "bg-ko/10 border-ko/45 text-[#FECACA]"
                    : "bg-brand/10 border-brand/40 text-white"
              }`}
            >
              <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 bg-white/10 text-white/70">
                {slot + 1}
              </span>
              {item ? (
                <button
                  type="button"
                  onClick={() => removeFrom(slot)}
                  disabled={revealed}
                  className="flex-1 text-left font-medium"
                  title={revealed ? undefined : t("Tap to take it back")}
                >
                  {item}
                </button>
              ) : (
                <span className="flex-1 text-sm text-white/25">{t("Tap an item below")}</span>
              )}
              {revealed && item && (right ? <CheckCircle size={18} className="text-ok shrink-0" /> : <XCircle size={18} className="text-ko shrink-0" />)}
            </li>
          )
        })}
      </ol>

      {!revealed && (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {remaining.map((item, i) => (
              <button
                key={item}
                type="button"
                onClick={() => add(item)}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-white/15 bg-white/[0.04] text-sm font-medium text-white/85 hover:bg-white/[0.08] hover:border-white/30 transition-colors"
              >
                <span className="hidden sm:inline text-[10px] font-bold text-white/30">{i + 1}</span>
                {item}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSequence((s) => s.slice(0, -1))}
              disabled={!sequence.length}
              aria-label={t("Undo")}
              className="p-3 rounded-xl border border-white/10 text-white/50 hover:text-white disabled:opacity-30"
            >
              <Undo2 size={17} />
            </button>
            <button
              type="button"
              onClick={() => setSequence([])}
              disabled={!sequence.length}
              aria-label={t("Start over")}
              className="p-3 rounded-xl border border-white/10 text-white/50 hover:text-white disabled:opacity-30"
            >
              <RotateCcw size={17} />
            </button>
            <button type="button" onClick={validate} disabled={!complete} className={`flex-1 ${primaryButton} py-3`}>
              {t("Validate")}
            </button>
          </div>
        </>
      )}

      {revealed && placed.some((item, i) => item !== answers[i]) && (
        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
          <p className="text-xs font-semibold text-white/45 mb-2">{t("Right order")}</p>
          <ol className="space-y-1 text-sm text-[#BBF7D0]">
            {answers.map((item, i) => (
              <li key={item}>
                {i + 1}. {item}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
