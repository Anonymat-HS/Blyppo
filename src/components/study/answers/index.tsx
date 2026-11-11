import { BookOpenText } from "lucide-react"
import type { QuizQuestion } from "@/lib/types"
import { typeOf, type QuizResponse } from "@/lib/utils/quiz"
import { useT } from "@/lib/i18n"
import ChoiceAnswer from "./ChoiceAnswer"
import TypedAnswer from "./TypedAnswer"
import OrderAnswer from "./OrderAnswer"

export { LETTERS } from "./ChoiceAnswer"

/** The way to answer a question, depending on its type. */
export function AnswerArea(props: {
  q: QuizQuestion
  result: QuizResponse | null
  onSubmit: (response: QuizResponse) => void
}) {
  const type = typeOf(props.q)
  // key: a fresh component (empty draft) for every question
  if (type === "short" || type === "cloze") return <TypedAnswer key={props.q.id} {...props} />
  if (type === "order") return <OrderAnswer key={props.q.id} {...props} />
  return <ChoiceAnswer key={props.q.id} {...props} />
}

/** Small label of the question type, shown above the question. */
export function TypeBadge({ q }: { q: QuizQuestion }) {
  const { t } = useT()
  const labels: Record<string, string> = {
    multiple: t("Several answers"),
    true_false: t("True or false"),
    short: t("Short answer"),
    cloze: t("Fill in the blank"),
    order: t("Put in order"),
  }
  const label = labels[typeOf(q)]
  if (!label) return null
  return (
    <span className="inline-block mb-2 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-spark/10 text-spark border border-spark/20">
      {label}
    </span>
  )
}

/** The text a question is about. */
export function PassageCard({ text }: { text: string }) {
  const { t } = useT()
  return (
    <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-white/[0.04] border border-white/10 border-l-4 border-l-brand">
      <p className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-brand-soft mb-2">
        <BookOpenText size={14} />
        {t("Read this text")}
      </p>
      <p className="text-sm sm:text-base leading-relaxed text-white/80 whitespace-pre-line">{text}</p>
    </div>
  )
}

/** A response as readable text, for the mistakes review. */
export function describeResponse(
  q: QuizQuestion,
  response: QuizResponse,
  t: (key: string) => string
): string {
  const label = (option: string) =>
    q.type === "true_false" ? (option === "true" ? t("True") : t("False")) : option
  if (response.kind === "choice") return response.picked.map((i) => label(q.options[i])).join(" ; ") || "—"
  if (response.kind === "order") return response.sequence.join(" → ")
  return response.value.trim() || "—"
}

/** The right answer as readable text. */
export function describeAnswer(q: QuizQuestion, t: (key: string) => string): string {
  const answers = q.answers ?? [q.bonne_reponse]
  if (q.type === "true_false") return answers[0] === "true" ? t("True") : t("False")
  if (q.type === "order") return answers.join(" → ")
  if (q.type === "short" || q.type === "cloze") return answers.join(" / ")
  return answers.join(" ; ")
}
