import { QUIZ_LENGTHS, type QuizLength } from "@/hooks/useQuizLength"

/** "Questions per round: 5 · 10 · 20" segmented control. */
export default function QuizLengthPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: QuizLength
  onChange: (n: QuizLength) => void
  disabled?: boolean
}) {
  return (
    <div className="inline-flex items-center gap-3 flex-wrap">
      <span id="quiz-length-label" className="text-xs font-semibold text-white/45">
        Questions per round
      </span>
      <div role="radiogroup" aria-labelledby="quiz-length-label" className="inline-flex p-1 rounded-xl bg-white/[0.04] border border-white/[0.08]">
        {QUIZ_LENGTHS.map((n) => (
          <button
            key={n}
            role="radio"
            aria-checked={value === n}
            disabled={disabled}
            onClick={() => onChange(n)}
            className={`min-w-11 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
              value === n ? "bg-brand text-white" : "text-white/50 hover:text-white"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}
