import { useEffect, useState, type CSSProperties } from "react"
import { CheckCircle, CheckSquare, Square, XCircle } from "lucide-react"
import type { QuizQuestion } from "@/lib/types"
import type { QuizResponse } from "@/lib/utils/quiz"
import { useT } from "@/lib/i18n"
import { primaryButton } from "@/components/ui/PageStates"

/** Answer letters, each with its game-show color */
export const LETTERS = [
  { key: "A", color: "#A78BFA" },
  { key: "B", color: "#22D3EE" },
  { key: "C", color: "#FFC83D" },
  { key: "D", color: "#F472B6" },
  { key: "E", color: "#4ADE80" },
]

/**
 * Options to pick: one (single, true / false, submitted on click) or several
 * (multiple, ticked then validated). Keys 1-5 / A-E pick, Enter validates.
 */
export default function ChoiceAnswer({
  q,
  result,
  onSubmit,
}: {
  q: QuizQuestion
  /** The submitted response, once answered */
  result: QuizResponse | null
  onSubmit: (response: QuizResponse) => void
}) {
  const { t } = useT()
  const multiple = q.type === "multiple"
  const trueFalse = q.type === "true_false"
  const [ticked, setTicked] = useState<number[]>([])
  const revealed = result !== null
  const picked = result?.kind === "choice" ? result.picked : ticked
  const answers = q.answers ?? []

  const label = (option: string) =>
    trueFalse ? (option === "true" ? t("True") : t("False")) : option

  const choose = (idx: number) => {
    if (revealed || idx >= q.options.length) return
    if (!multiple) return onSubmit({ kind: "choice", picked: [idx] })
    setTicked((list) => (list.includes(idx) ? list.filter((i) => i !== idx) : [...list, idx]))
  }

  const validate = () => {
    if (!revealed && ticked.length) onSubmit({ kind: "choice", picked: ticked })
  }

  useEffect(() => {
    if (revealed) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if ((e.target as HTMLElement).closest("input, textarea")) return
      const key = e.key.toLowerCase()
      const idx = "12345".includes(key) ? Number(key) - 1 : "abcde".indexOf(key)
      if (key.length === 1 && idx >= 0) {
        e.preventDefault()
        choose(idx)
      } else if (key === "enter" && multiple && !(e.target as HTMLElement).closest("button")) {
        e.preventDefault()
        validate()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  })

  return (
    <div className="mb-6">
      {multiple && !revealed && (
        <p className="text-xs font-semibold text-spark mb-3">{t("Several answers are right: tick them all.")}</p>
      )}
      <div className={trueFalse ? "grid grid-cols-2 gap-3" : "space-y-3"}>
        {q.options.map((option, idx) => {
          const isPicked = picked.includes(idx)
          const isRight = answers.includes(option)
          const letter = LETTERS[idx] ?? LETTERS[0]

          let tile = isPicked
            ? "bg-brand/15 border-brand/60 text-white"
            : "bg-white/[0.03] border-white/[0.09] text-white/80 enabled:hover:bg-white/[0.06] enabled:hover:border-white/20 enabled:hover:-translate-y-0.5"
          let badge: CSSProperties = { background: letter.color + "22", color: letter.color, borderColor: letter.color + "55" }
          if (revealed) {
            if (isRight) {
              tile = `bg-ok/10 border-ok/45 text-[#BBF7D0] ${isPicked ? "animate-pop" : "border-dashed"}`
              badge = { background: "#22C55E", color: "#fff", borderColor: "#22C55E" }
            } else if (isPicked) {
              tile = "bg-ko/10 border-ko/45 text-[#FECACA] animate-shake"
              badge = { background: "#EF4444", color: "#fff", borderColor: "#EF4444" }
            } else {
              tile = "bg-transparent border-white/[0.05] text-white/30"
              badge = { color: "rgba(255,255,255,0.3)", borderColor: "rgba(255,255,255,0.1)" }
            }
          }

          return (
            <button
              key={option}
              onClick={() => choose(idx)}
              disabled={revealed}
              role={multiple ? "checkbox" : undefined}
              aria-checked={multiple ? isPicked : undefined}
              className={`w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border-2 text-left transition-all duration-200 ${tile} ${
                trueFalse ? "justify-center py-5 text-lg font-bold" : ""
              }`}
            >
              {!trueFalse && (
                <span
                  className="w-9 h-9 rounded-xl border text-sm font-black flex items-center justify-center shrink-0 transition-colors"
                  style={badge}
                >
                  {letter.key}
                </span>
              )}
              <span className={trueFalse ? "" : "font-medium flex-1"}>{label(option)}</span>
              {multiple && !revealed && (isPicked ? <CheckSquare size={19} className="shrink-0 text-brand-soft" /> : <Square size={19} className="shrink-0 text-white/25" />)}
              {revealed && isRight && <CheckCircle size={19} className="shrink-0 text-ok" />}
              {revealed && isPicked && !isRight && <XCircle size={19} className="shrink-0 text-ko" />}
            </button>
          )
        })}
      </div>

      {multiple && !revealed && (
        <button onClick={validate} disabled={!ticked.length} className={`w-full mt-4 ${primaryButton} py-3.5`}>
          {ticked.length > 1 ? t("Validate my {n} answers", { n: ticked.length }) : t("Validate")}
          <span className="hidden sm:inline text-xs font-normal text-white/60">{t("(Enter)")}</span>
        </button>
      )}
    </div>
  )
}
