import type { ReactNode } from "react"
import { Logo } from "@/components/ui/Logo"

/** Centered logo + card used by the password screens. */
export default function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0F0F12]">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <Logo size="lg" />
        </div>

        <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
          <h1 className="text-xl font-bold text-white mb-1">{title}</h1>
          <p className="text-sm mb-6 text-white/40">{subtitle}</p>
          {children}
        </div>

        {footer && <div className="text-center text-sm mt-5">{footer}</div>}
      </div>
    </div>
  )
}

export const authInputClass =
  "w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none transition-all duration-150 bg-white/5 border border-white/10 focus:border-[#7C5CFF]/50 focus:ring-[3px] focus:ring-[#7C5CFF]/10"

export const authButtonClass =
  "w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 bg-[#7C5CFF] hover:bg-[#8B6BFF] disabled:opacity-50"

export const authLinkClass =
  "font-semibold text-[#A78BFA] hover:text-[#C4B5FD] transition-colors duration-150"

export function AuthError({ message }: { message: string }) {
  return (
    <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-red-500/10 border border-red-500/25 text-[#FCA5A5]">
      {message}
    </div>
  )
}
