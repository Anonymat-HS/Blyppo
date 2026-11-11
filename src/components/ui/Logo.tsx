import { useId } from "react"

/** The Revizo mark: a review loop around a check. Same drawing as public/logo.svg. */
export function LogoMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  // Each mark on the page needs its own gradient id
  const gradientId = `rz-bg-${useId()}`
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
      <path d="M48 32 A16 16 0 1 1 41.9 19.3" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M46.6 23.4 L46.1 14.9 L37.9 22.9 Z" fill="#fff" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
      <path
        d="M24.5 32.5 L30 38 L40 27.5"
        fill="none"
        stroke="#00D9FF"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const SIZES = {
  sm: { mark: 32, text: "text-base" },
  md: { mark: 40, text: "text-lg" },
  lg: { mark: 48, text: "text-2xl" },
} as const

/** Mark + wordmark. The "o" picks up the check's cyan. */
export function Logo({ size = "md", className = "" }: { size?: keyof typeof SIZES; className?: string }) {
  const s = SIZES[size]
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={s.mark} />
      <span className={`font-black tracking-tight text-white ${s.text}`}>
        Reviz<span className="text-[#00D9FF]">o</span>
      </span>
    </span>
  )
}
