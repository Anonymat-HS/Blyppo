const COLORS = ["#7C5CFF", "#00D9FF", "#FFC83D", "#22C55E", "#EC4899", "#F97316"]

/** A stable accent color for a course, so it looks the same on every screen. */
export function courseColor(courseId: string): string {
  let hash = 0
  for (let i = 0; i < courseId.length; i++) hash = (hash * 31 + courseId.charCodeAt(i)) | 0
  return COLORS[Math.abs(hash) % COLORS.length]
}

/** One or two letters standing for a course title ("Network Basics" → "NB"). */
export function courseInitials(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "?"
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}
