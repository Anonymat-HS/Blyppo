import { useId } from "react"

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

/** Mark + wordmark. The "o" picks up the spark's yellow. */
export function Logo({ size = "md", className = "" }: { size?: keyof typeof SIZES; className?: string }) {
  const s = SIZES[size]
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={s.mark} />
      <span className={`font-black tracking-tight text-white ${s.text}`}>
        Kwiz<span className="text-[#FFC83D]">o</span>
      </span>
    </span>
  )
}
