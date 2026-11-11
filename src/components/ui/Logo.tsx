import { useId } from "react"
import { useT } from "@/lib/i18n"

/**
 * The Blyppo mark: a quiz card (a question and its options, the right one
 * ticked) in front of a flashcard, with the yellow spark. Same drawing as
 * public/logo.svg. Below 24 px the pale options and the spark are left out.
 */
export function LogoMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  // Each mark on the page needs its own gradient id
  const gradientId = `bl-bg-${useId()}`
  const detailed = size >= 24
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
      {/* Flashcard behind */}
      <rect x="10" y="12" width="29" height="40" rx="6" fill="#FFC83D" transform="rotate(-12 24.5 32)" />
      {/* Quiz card: a question, three options, the right one ticked */}
      <g transform="rotate(6 33 32)">
        <rect x="19" y="10" width="30" height="43" rx="6" fill="#fff" />
        <path
          d="M30.6 16.6 A3 3 0 1 1 34.9 19.2 C34 19.7 33.6 20.3 33.6 21.3"
          fill="none"
          stroke="#6D4CFF"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <circle cx="33.6" cy="24.7" r="1.5" fill="#6D4CFF" />
        {detailed && <rect x="23" y="29" width="22" height="4.6" rx="2.3" fill="#E4DDFF" />}
        <rect x="23" y="36" width="22" height="6" rx="3" fill="#22C55E" />
        <path
          d="M26 39 L27.9 40.9 L31.3 37.5"
          fill="none"
          stroke="#fff"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {detailed && <rect x="23" y="44.4" width="22" height="4.6" rx="2.3" fill="#E4DDFF" />}
      </g>
      {detailed && (
        <path d="M55 4.5 L56.3 8 L59.8 9.3 L56.3 10.6 L55 14.1 L53.7 10.6 L50.2 9.3 L53.7 8 Z" fill="#FFC83D" />
      )}
    </svg>
  )
}

const SIZES = {
  sm: { mark: 32, text: "text-base" },
  md: { mark: 40, text: "text-lg" },
  lg: { mark: 48, text: "text-2xl" },
} as const

/** The company behind Blyppo, shown with the logo and in footers. */
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
          Blypp<span className="text-[#FFC83D]">o</span>
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
