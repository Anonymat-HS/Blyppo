import { AlertCircle } from "lucide-react"

/** Inline notice shown when progress could not be saved. */
export default function SaveWarning({ message }: { message: string }) {
  return (
    <div
      className="mb-4 p-3 rounded-xl flex items-center gap-2 text-xs"
      style={{
        background: "rgba(245,158,11,0.08)",
        border: "1px solid rgba(245,158,11,0.22)",
        color: "#FCD34D",
      }}
    >
      <AlertCircle size={14} className="shrink-0" />
      {message}
    </div>
  )
}
