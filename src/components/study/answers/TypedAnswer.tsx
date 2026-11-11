import { useEffect, useRef, useState } from "react"
import { CheckCircle, XCircle } from "lucide-react"
import type { QuizQuestion } from "@/lib/types"
import { grade, type QuizResponse } from "@/lib/utils/quiz"
import { useT } from "@/lib/i18n"
import { primaryButton } from "@/components/ui/PageStates"

/**
 * A typed answer: a short answer field, or (cloze) the sentence with an input
 * in place of its blank. Enter validates.
 */
export default function TypedAnswer({
  q,
  result,
  onSubmit,
}: {
  q: QuizQuestion
  result: QuizResponse | null
  onSubmit: (response: QuizResponse) => void
}) {
  const { t } = useT()
  const [value, setValue] = useState("")
  const input = useRef<HTMLInputElement>(null)
  const revealed = result !== null
  const typed = result?.kind === "text" ? result.value : value
  const right = revealed && grade(q, result)
  const answers = q.answers ?? []

  useEffect(() => {
    if (!revealed) input.current?.focus()
  }, [q.id, revealed])

  const field = (
    <input
      ref={input}
      value={typed}
      onChange={(e) => setValue(e.target.value.slice(0, 120))}
      disabled={revealed}
      aria-label={t("Your answer")}
      placeholder={q.type === "cloze" ? "…" : t("Type your answer")}
      autoComplete="off"
      autoCapitalize="off"
      spellCheck={false}
      className={`rounded-xl px-3.5 py-2.5 text-base font-semibold text-white outline-none border-2 transition-colors bg-white/[0.04] ${
        revealed
          ? right
            ? "border-ok/60 bg-ok/10 text-[#BBF7D0]"
            : "border-ko/60 bg-ko/10 text-[#FECACA] animate-shake"
          : "border-white/15 focus:border-brand/70"
      } ${q.type === "cloze" ? "inline-block w-40 sm:w-48 mx-1 py-1.5 text-center align-baseline" : "w-full"}`}
    />
  )

  const [before, after = ""] = q.question.split("___")

  return (
    <form
      className="mb-6"
      onSubmit={(e) => {
        e.preventDefault()
        if (!revealed && value.trim()) onSubmit({ kind: "text", value })
      }}
    >
      {q.type === "cloze" ? (
        <p className="text-lg md:text-xl leading-loose text-white/90 mb-4">
          {before}
          {field}
          {after}
        </p>
      ) : (
        <div className="mb-4">{field}</div>
      )}

      {revealed ? (
        <p className={`flex items-center gap-2 text-sm ${right ? "text-ok" : "text-white/70"}`}>
          {right ? <CheckCircle size={16} className="shrink-0" /> : <XCircle size={16} className="shrink-0 text-ko" />}
          {right
            ? answers.length > 1 && !answers.some((a) => a.trim().toLowerCase() === typed.trim().toLowerCase())
              ? t("Accepted. Expected: {answer}", { answer: answers[0] })
              : t("Exactly!")
            : t("Expected: {answer}", { answer: answers.join(" / ") })}
        </p>
      ) : (
        <button type="submit" disabled={!value.trim()} className={`w-full ${primaryButton} py-3.5`}>
          {t("Validate")}
          <span className="hidden sm:inline text-xs font-normal text-white/60">{t("(Enter)")}</span>
        </button>
      )}
    </form>
  )
}
