import { AlertCircle, RefreshCw } from "lucide-react"

/** Full-page message shown when data could not be loaded. */
export default function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="p-6 md:p-8 max-w-lg mx-auto">
      <div
        className="p-8 rounded-2xl text-center"
        style={{
          background: "rgba(239,68,68,0.06)",
          border: "1px solid rgba(239,68,68,0.2)",
        }}
      >
        <AlertCircle size={28} className="mx-auto mb-3" style={{ color: "#F87171" }} />
        <p className="font-bold text-sm text-white mb-1">Something went wrong</p>
        <p className="text-xs mb-5" style={{ color: "rgba(255,255,255,0.45)" }}>
          {message}
        </p>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#7C5CFF] hover:bg-[#8B6BFF] transition-colors duration-200"
        >
          <RefreshCw size={14} />
          Try again
        </button>
      </div>
    </div>
  )
}
