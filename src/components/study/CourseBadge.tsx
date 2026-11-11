import { courseColor, courseInitials } from "@/lib/utils/courseColor"

/** Colored tile with a course's initials. */
export default function CourseBadge({
  id,
  title,
  size = 40,
}: {
  id: string
  title: string
  size?: number
}) {
  const color = courseColor(id)
  return (
    <div
      aria-hidden="true"
      className="rounded-xl flex items-center justify-center shrink-0 font-black"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        color,
        background: color + "1F",
        border: `1px solid ${color}40`,
      }}
    >
      {courseInitials(title)}
    </div>
  )
}
