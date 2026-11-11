import { useState } from "react"
import { Trash2 } from "lucide-react"
import { deleteAccount } from "@/lib/supabase/functions"
import { useT } from "@/lib/i18n"

const CONFIRM_WORD = "DELETE"

/** "Danger zone" card: deletes the account after the user types a confirmation word. */
export default function DeleteAccount() {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      // On success the auth listener signs the user out and this screen unmounts
      await deleteAccount()
    } catch (err) {
      setError((err as Error).message)
      setDeleting(false)
    }
  }

  return (
    <div className="p-6 rounded-2xl mt-6 bg-red-500/[0.04] border border-red-500/20">
      <h2 className="font-bold text-white mb-1">{t("Delete account")}</h2>
      <p className="text-xs mb-4 text-white/40">
        {t("Permanently deletes your account, courses, quizzes, flashcards and progress. This cannot be undone.")}
      </p>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[#FCA5A5] border border-red-500/30 hover:bg-red-500/10 transition-colors duration-150"
        >
          <Trash2 size={14} />
          {t("Delete my account")}
        </button>
      ) : (
        <div className="space-y-3">
          <label htmlFor="confirm-delete" className="block text-xs text-white/50">
            {t("Type {word} to confirm").split("{word}").map((part, i) => (
              <span key={i}>
                {i > 0 && <strong className="text-white">{CONFIRM_WORD}</strong>}
                {part}
              </span>
            ))}
          </label>
          <input
            id="confirm-delete"
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            className="w-full max-w-xs px-4 py-2 rounded-xl text-sm text-white outline-none bg-white/5 border border-white/10 focus:border-red-500/50"
          />
          {error && <p className="text-xs text-[#FCA5A5]">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={typed !== CONFIRM_WORD || deleting}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:hover:bg-red-600 transition-colors duration-150"
            >
              {deleting ? t("Deleting...") : t("Delete permanently")}
            </button>
            <button
              onClick={() => {
                setOpen(false)
                setTyped("")
                setError(null)
              }}
              disabled={deleting}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white/60 border border-white/[0.08] hover:bg-white/5 transition-colors duration-150"
            >
              {t("Cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
