import type { ComponentType, ReactNode } from "react"
import { ChevronLeft, Loader2 } from "lucide-react"

/** A lucide-react icon component. */
export type IconType = ComponentType<{ size?: number; className?: string }>

export function BackButton({ onClick, label = "Back" }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors duration-150 text-white/40 hover:text-white/85"
    >
      <ChevronLeft size={15} />
      {label}
    </button>
  )
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]" role="status">
      <div className="text-center">
        <Loader2 size={26} className="animate-spin mx-auto mb-3 text-brand" />
        <p className="text-sm text-white/40">{label}</p>
      </div>
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
  tone = "brand",
}: {
  icon: IconType
  title: string
  text: string
  action?: ReactNode
  tone?: "brand" | "spark"
}) {
  const toneClass =
    tone === "spark"
      ? "bg-spark/[0.05] border-spark/25 text-spark"
      : "bg-brand/[0.05] border-brand/25 text-brand-soft"
  return (
    <div className={`p-8 rounded-2xl text-center border border-dashed ${toneClass}`}>
      <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-current/10">
        <Icon size={26} />
      </div>
      <p className="font-bold text-white mb-1">{title}</p>
      <p className="text-sm text-white/45">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/** Primary call to action, in the brand violet. */
export const primaryButton =
  "inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all duration-200 bg-brand hover:bg-brand-hover hover:shadow-[0_0_24px_rgba(124,92,255,0.4)] active:scale-[0.98] disabled:opacity-50"

/** Secondary action, outlined. */
export const secondaryButton =
  "inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 border border-white/10 text-white/65 hover:bg-white/5 hover:text-white/90 hover:border-white/20"
