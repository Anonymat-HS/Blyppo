import { useEffect, useState } from "react"
import { useT } from "@/lib/i18n"

/** Circular score that fills up when it appears. */
export default function ScoreRing({ pct, color, size = 148 }: { pct: number; color: string; size?: number }) {
  const { t } = useT()
  const [shown, setShown] = useState(0)
  useEffect(() => {
    // Start empty, then fill on the next frame so the transition runs
    const id = requestAnimationFrame(() => setShown(pct))
    return () => cancelAnimationFrame(id)
  }, [pct])

  const stroke = 12
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - shown / 100)}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black" style={{ color }}>
          {pct}%
        </span>
        <span className="text-[11px] font-semibold tracking-wider text-white/35">{t("SCORE")}</span>
      </div>
    </div>
  )
}
