import { ArrowRight } from "lucide-react"
import type { IconType } from "@/components/ui/PageStates"
import type { CourseSummary } from "@/lib/types"
import CourseBadge from "./CourseBadge"

/** List of courses to start a quiz or a flashcard session from. */
export default function CoursePicker<T extends CourseSummary>({
  title,
  subtitle,
  icon: Icon,
  courses,
  count,
  unit,
  onPick,
}: {
  title: string
  subtitle: string
  icon: IconType
  courses: T[]
  /** Number of questions or cards of a course */
  count: (course: T) => number
  /** "question" or "card", pluralised with an "s" */
  unit: string
  onPick: (course: T) => void
}) {
  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-brand/15 border border-brand/25 text-brand-soft">
          <Icon size={20} />
        </div>
        <div>
          <h1 className="text-xl font-black text-white">{title}</h1>
          <p className="text-sm text-white/40">{subtitle}</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {courses.map((course, i) => {
          const n = count(course)
          return (
            <button
              key={course.id}
              onClick={() => onPick(course)}
              style={{ animationDelay: `${i * 40}ms` }}
              className="animate-rise group w-full flex items-center gap-3.5 p-3.5 rounded-2xl text-left transition-all duration-200 bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.06] hover:border-brand/35 hover:-translate-y-0.5"
            >
              <CourseBadge id={course.id} title={course.titre} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-white truncate">{course.titre}</p>
                <p className={`text-xs mt-0.5 ${n > 0 ? "text-white/40" : "text-spark/80"}`}>
                  {n > 0 ? `${n} ${unit}${n !== 1 ? "s" : ""}` : `No ${unit}s yet`}
                </p>
              </div>
              <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 bg-white/5 text-white/40 group-hover:bg-brand group-hover:text-white">
                <ArrowRight size={16} />
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}
