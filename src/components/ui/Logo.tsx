import { useId } from "react"
import { useT } from "@/lib/i18n"

/** The Kwizo mark: a quiz bubble with a spark. Same drawing as public/logo.svg. */
export function LogoMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  // Each mark on the page needs its own gradient id
  const gradientId = `kz-bg-${useId()}`
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8B6BFF" />
          <stop offset="1" stopColor="#5B3DF5" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${gradientId})`} />
      <path
        d="M22 13 H42 A10 10 0 0 1 52 23 V35 A10 10 0 0 1 42 45 H28 L18 53 V44.2 A10 10 0 0 1 12 35 V23 A10 10 0 0 1 22 13 Z"
        fill="#fff"
      />
      <path
        d="M26.5 24.5 A5.5 5.5 0 1 1 34.5 29.4 C32.8 30.3 32 31.3 32 33.3"
        fill="none"
        stroke="#6D4CFF"
        strokeWidth="4.6"
        strokeLinecap="round"
      />
      <circle cx="32" cy="39.2" r="2.7" fill="#6D4CFF" />
      <path d="M51 6 L52.6 10.4 L57 12 L52.6 13.6 L51 18 L49.4 13.6 L45 12 L49.4 10.4 Z" fill="#FFC83D" />
    </svg>
  )
}

const SIZES = {
  sm: { mark: 32, text: "text-base" },
  md: { mark: 40, text: "text-lg" },
  lg: { mark: 48, text: "text-2xl" },
} as const

/** The company behind Kwizo, shown with the logo and in footers. */
export const COMPANY = "H.S"

/** Mark + wordmark. The "o" picks up the spark's yellow. `byline` adds "by H.S" under it. */
export function Logo({
  size = "md",
  byline = false,
  className = "",
}: {
  size?: keyof typeof SIZES
  byline?: boolean
  className?: string
}) {
  const { t } = useT()
  const s = SIZES[size]
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={s.mark} />
      <span className="flex flex-col items-start text-left leading-none">
        <span className={`font-black tracking-tight text-white ${s.text}`}>
          Kwiz<span className="text-[#FFC83D]">o</span>
        </span>
        {byline && (
          <span className="mt-1 whitespace-nowrap text-[10px] font-bold tracking-[0.12em] uppercase text-white/55">
            {t("by")} <span className="text-[#FFC83D]">{COMPANY}</span>
          </span>
        )}
      </span>
    </span>
  )
}

/** "H.S" badge with its monogram. */
export function CompanyBadge({ label = "A product of" }: { label?: string }) {
  const { t } = useT()
  return (
    <span className="inline-flex items-center gap-2.5 pl-1.5 pr-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10">
      <span
        aria-hidden="true"
        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-[#16161D] bg-gradient-to-br from-[#FFD873] to-[#FFC83D]"
      >
        H.S
      </span>
      <span className="text-xs text-white/50">
        {t(label)} <span className="font-bold text-white">{COMPANY}</span>
      </span>
    </span>
  )
}
