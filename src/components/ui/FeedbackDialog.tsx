import { useEffect, useRef, useState } from "react"
import { CheckCircle, Flag, Loader2, MessageSquareHeart, X } from "lucide-react"
import { submitFeedback, type FeedbackInput, type ReportReason } from "@/lib/api"
import { primaryButton } from "@/components/ui/PageStates"
import { useT } from "@/lib/i18n"

const REASONS: { id: ReportReason; label: string }[] = [
  { id: "wrong_answer", label: "The answer is wrong" },
  { id: "unclear", label: "Unclear or ambiguous" },
  { id: "off_topic", label: "Not in my course" },
  { id: "typo", label: "Typo or formatting" },
  { id: "other", label: "Something else" },
]

const RATINGS = ["😞", "😕", "😐", "🙂", "😍"]

/** What the dialog is about: one quiz question, one flashcard, or the app in general. */
export type FeedbackTarget =
  | { kind: "question"; id: string; text: string }
  | { kind: "flashcard"; id: string; text: string }
  | { kind: "general"; page?: string }

/** Modal to report a question / card, or to send general feedback. */
export default function FeedbackDialog({ target, onClose }: { target: FeedbackTarget; onClose: () => void }) {
  const { t } = useT()
  const isReport = target.kind !== "general"
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [rating, setRating] = useState<number | null>(null)
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const firstField = useRef<HTMLButtonElement | HTMLTextAreaElement | null>(null)

  // Latest onClose, so the listener below is set up once even if the parent re-renders
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    firstField.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current()
      // Keep the quiz / flashcard keyboard shortcuts from firing behind the dialog
      e.stopPropagation()
    }
    window.addEventListener("keydown", onKey, true)
    return () => {
      window.removeEventListener("keydown", onKey, true)
      previous?.focus()
    }
  }, [])

  const canSend = isReport ? reason !== null : message.trim().length > 0

  const send = async () => {
    if (!canSend) return
    setSending(true)
    setError(null)
    let input: FeedbackInput
    if (target.kind === "question") {
      input = { kind: "question", quizId: target.id, reason: reason!, message, snapshot: target.text }
    } else if (target.kind === "flashcard") {
      input = { kind: "flashcard", flashcardId: target.id, reason: reason!, message, snapshot: target.text }
    } else {
      input = { kind: "general", rating: rating ?? undefined, message, page: target.page }
    }
    try {
      await submitFeedback(input)
      setSent(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        className="animate-rise w-full max-w-md rounded-3xl p-6 bg-panel border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-start gap-3 mb-5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isReport ? "bg-ko/15 text-ko" : "bg-spark/15 text-spark"
            }`}
          >
            {isReport ? <Flag size={18} /> : <MessageSquareHeart size={18} />}
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="feedback-title" className="font-black text-white">
              {isReport
                ? target.kind === "question"
                  ? t("Report this question")
                  : t("Report this card")
                : t("Tell us what you think")}
            </h2>
            <p className="text-xs text-white/45 mt-0.5">
              {isReport
                ? t("Thanks for helping us fix it. H.S reads every report.")
                : t("A bug, an idea, something you love: it goes straight to the H.S team.")}
            </p>
          </div>
          <button onClick={onClose} aria-label={t("Close")} className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/5">
            <X size={18} />
          </button>
        </div>

        {sent ? (
          <div className="text-center py-6" role="status">
            <CheckCircle size={40} className="mx-auto mb-3 text-ok" />
            <p className="font-bold text-white">{t("Thank you!")}</p>
            <p className="text-sm text-white/45 mt-1 mb-6">
              {isReport ? t("We'll look at this one.") : t("Your message has been sent.")}
            </p>
            <button onClick={onClose} className={primaryButton}>
              {t("Close")}
            </button>
          </div>
        ) : (
          <>
            {isReport && (
              <p className="text-sm text-white/70 mb-4 p-3 rounded-xl bg-white/[0.04] border border-white/[0.07] line-clamp-3">
                {target.text}
              </p>
            )}

            {isReport ? (
              <fieldset className="mb-4">
                <legend className="text-xs font-semibold text-white/50 mb-2">{t("What's wrong?")}</legend>
                <div className="flex flex-wrap gap-2">
                  {REASONS.map((r, i) => (
                    <button
                      key={r.id}
                      ref={i === 0 ? (el) => { firstField.current = el } : undefined}
                      onClick={() => setReason(r.id)}
                      aria-pressed={reason === r.id}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        reason === r.id
                          ? "bg-brand/25 border-brand/50 text-white"
                          : "bg-white/[0.03] border-white/10 text-white/60 hover:text-white hover:border-white/25"
                      }`}
                    >
                      {t(r.label)}
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : (
              <fieldset className="mb-4">
                <legend className="text-xs font-semibold text-white/50 mb-2">{t("How do you like Kwizo? (optional)")}</legend>
                <div className="flex gap-2">
                  {RATINGS.map((emoji, i) => (
                    <button
                      key={emoji}
                      onClick={() => setRating(rating === i + 1 ? null : i + 1)}
                      aria-label={t("{n} out of 5", { n: i + 1 })}
                      aria-pressed={rating === i + 1}
                      className={`w-11 h-11 rounded-xl text-xl border transition-all ${
                        rating === i + 1
                          ? "bg-spark/15 border-spark/50 scale-110"
                          : "bg-white/[0.03] border-white/10 opacity-60 hover:opacity-100"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            <label className="block mb-5">
              <span className="text-xs font-semibold text-white/50">
                {isReport ? t("Details (optional)") : t("Your message")}
              </span>
              <textarea
                ref={!isReport ? (el) => { firstField.current = el } : undefined}
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
                rows={isReport ? 3 : 5}
                placeholder={isReport ? t("e.g. the right answer is…") : t("What should we improve?")}
                className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl text-sm text-white outline-none resize-none bg-white/5 border border-white/10 focus:border-brand/50 placeholder:text-white/25"
              />
            </label>

            {error && (
              <p className="text-xs text-[#FCA5A5] mb-3" role="alert">
                {error}
              </p>
            )}

            <button onClick={send} disabled={!canSend || sending} className={`w-full ${primaryButton}`}>
              {sending && <Loader2 size={15} className="animate-spin" />}
              {sending ? t("Sending...") : isReport ? t("Send report") : t("Send")}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
