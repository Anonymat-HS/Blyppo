const COLORS = ["#7C5CFF", "#FFC83D", "#00D9FF", "#4ADE80", "#EC4899"]

/** Spread in [0, 1) that looks random but stays the same between renders. */
const spread = (i: number, seed: number) => ((i + 1) * seed) % 1

/** A short burst of confetti over its positioned parent. Hidden by prefers-reduced-motion. */
export default function Confetti({ pieces = 36 }: { pieces?: number }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden">
      {Array.from({ length: pieces }, (_, i) => (
        <span
          key={i}
          className="kz-confetti-piece"
          style={{
            left: `${spread(i, 0.618034) * 100}%`,
            background: COLORS[i % COLORS.length],
            animationDelay: `${spread(i, 0.414214) * 0.6}s`,
            animationDuration: `${1.8 + spread(i, 0.732051) * 1.2}s`,
          }}
        />
      ))}
    </div>
  )
}
