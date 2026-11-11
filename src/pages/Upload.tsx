import { useState, useRef, useCallback, useEffect } from "react"
import {
  Upload as UploadIcon,
  FileText,
  Sparkles,
  CheckCircle,
  ChevronLeft,
  AlertCircle,
  Brain,
  CreditCard,
} from "lucide-react"
import { callGenerateFunction, uploadCourseFile } from "@/lib/supabase/functions"
import { fetchMyPlan, fetchRecentCourses } from "@/lib/api"
import type { CourseSummary, PlanLimits } from "@/lib/types"

type UploadState = "idle" | "dragover" | "processing" | "generating" | "done" | "error"

export default function Upload({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<UploadState>("idle")
  const [progress, setProgress] = useState(0)
  const [filename, setFilename] = useState("")
  const [titre, setTitre] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [recentCourses, setRecentCourses] = useState<CourseSummary[]>([])
  const [plan, setPlan] = useState<PlanLimits | null>(null)
  const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null)
  const [quizError, setQuizError] = useState<string | null>(null)
  const [flashcardError, setFlashcardError] = useState<string | null>(null)
  const [retryingMsg, setRetryingMsg] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const maxFileMb = plan?.max_file_mb ?? 20

  // The list is a convenience: the page stays usable if it cannot be loaded
  const loadRecentCourses = useCallback(() => {
    fetchRecentCourses().then(setRecentCourses).catch(() => {})
  }, [])

  useEffect(() => {
    loadRecentCourses()
    fetchMyPlan().then(setPlan).catch(() => {})
  }, [loadRecentCourses])

  const generateContent = async (courseId: string) => {
    setState("generating")
    setQuizError(null)
    setFlashcardError(null)
    setRetryingMsg(null)

    // Generate quiz first
    try {
      await callGenerateFunction("generate-quiz", courseId, "numberOfQuestions", 10, setRetryingMsg)
    } catch (err) {
      setQuizError((err as Error).message)
    }

    // Wait 4 seconds before generating flashcards to let rate limit cool down
    setRetryingMsg("Pausing between generations...")
    await new Promise((r) => setTimeout(r, 4000))
    setRetryingMsg(null)

    // Generate flashcards
    try {
      await callGenerateFunction("generate-flashcards", courseId, "numberOfCards", 15, setRetryingMsg)
    } catch (err) {
      setFlashcardError((err as Error).message)
    }

    setRetryingMsg(null)
    setState("done")
    loadRecentCourses()
  }

  const handleUpload = useCallback(async (file: File, title: string) => {
    if (!title.trim()) {
      setErrorMessage("Please enter a course title before uploading.")
      setState("error")
      return
    }

    if (file.size > maxFileMb * 1024 * 1024) {
      setErrorMessage(`File exceeds the ${maxFileMb} MB limit of your plan.`)
      setState("error")
      return
    }

    if (!/\.(pdf|txt|md)$/i.test(file.name)) {
      setErrorMessage("Unsupported file type. Please upload a PDF, TXT, or MD file.")
      setState("error")
      return
    }

    setFilename(file.name)
    setTitre(title.trim())
    setState("processing")
    setProgress(0)
    setErrorMessage("")

    try {
      const { courseId, quota } = await uploadCourseFile(file, title.trim(), setProgress)
      if (quota) setQuota(quota)
      await generateContent(courseId)
    } catch (err) {
      setErrorMessage((err as Error).message)
      setState("error")
    }
  }, [maxFileMb])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) {
        const title =
          titre.trim() || file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ")
        handleUpload(file, title)
      }
    },
    [handleUpload, titre]
  )

  // The upload is measured; extraction runs server-side and is only known to be in progress
  const uploaded = progress >= 100
  const processingSteps = [
    { label: "Uploading document", done: uploaded },
    { label: "Extracting text and saving to your library", done: false },
  ]

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm mb-6 transition-colors duration-150 text-[rgba(255,255,255,0.38)] hover:text-[rgba(255,255,255,0.8)]"
      >
        <ChevronLeft size={15} />
        Back to Dashboard
      </button>

      <h1 className="text-2xl md:text-3xl font-black text-white mb-1.5">
        Upload Course Material
      </h1>
      <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.38)" }}>
        Our AI generates quizzes and flashcards automatically from your notes
      </p>

      {(state === "idle" || state === "dragover") && (
        <>
          {/* Title input */}
          <div className="mb-4">
            <label htmlFor="upload-course-title" className="block text-xs font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
              Course title
            </label>
            <input
                id="upload-course-title"
              type="text"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="e.g. Introduction to Algorithms - Chapter 1-4"
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none transition-all duration-150 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] focus:border-[rgba(124,92,255,0.5)] focus:shadow-[0_0_0_3px_rgba(124,92,255,0.1)]"
            />
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setState("dragover")
            }}
            onDragLeave={() => setState("idle")}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`cursor-pointer rounded-2xl p-8 sm:p-14 text-center transition-all duration-200 ${
              state === "idle"
                ? "hover:border-[rgba(124,92,255,0.4)]! hover:bg-[rgba(124,92,255,0.04)]!"
                : ""
            }`}
            style={{
              border: `2px dashed ${state === "dragover" ? "rgba(124,92,255,0.6)" : "rgba(255,255,255,0.12)"}`,
              background:
                state === "dragover"
                  ? "rgba(124,92,255,0.08)"
                  : "rgba(255,255,255,0.02)",
            }}
          >
            <div className="flex flex-col items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: "rgba(124,92,255,0.12)",
                  border: "1px solid rgba(124,92,255,0.22)",
                }}
              >
                <UploadIcon size={26} style={{ color: "#A78BFA" }} />
              </div>
              <div>
                <p className="font-bold text-lg text-white">
                  {state === "dragover"
                    ? "Drop it here!"
                    : "Drop your file here"}
                </p>
                <p
                  className="text-sm mt-1"
                  style={{ color: "rgba(255,255,255,0.38)" }}
                >
                  or{" "}
                  <span style={{ color: "#A78BFA" }}>click to browse</span>{" "}
                  your files
                </p>
              </div>
              <div className="flex gap-2 mt-1 flex-wrap justify-center">
                {["PDF", "TXT", "MD"].map((fmt) => (
                  <span
                    key={fmt}
                    className="px-2.5 py-1 text-xs rounded-lg font-mono"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.45)",
                    }}
                  >
                    {fmt}
                  </span>
                ))}
              </div>
              <p
                className="text-xs text-center"
                style={{ color: "rgba(255,255,255,0.22)" }}
              >
                Max {maxFileMb} MB · text only, no scanned PDFs
              </p>
              <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.22)" }}>
                <span className="capitalize">{plan?.id ?? "free"}</span> plan ·{" "}
                {quota
                  ? `${Math.max(0, quota.limit - quota.used)} of ${quota.limit} uploads left today`
                  : `up to ${plan?.daily_courses ?? 10} uploads per 24 h`}
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.txt,.md"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) {
                  const title =
                    titre.trim() ||
                    f.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ")
                  handleUpload(f, title)
                }
              }}
            />
          </div>

          {/* Recent courses */}
          {recentCourses.length > 0 && (
            <div className="mt-8">
              <p
                className="text-xs font-semibold mb-3 tracking-wider"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                RECENT COURSES
              </p>
              {recentCourses.map((course) => (
                <div
                  key={course.id}
                  className="flex items-center gap-3 p-3 rounded-xl transition-colors duration-150 cursor-pointer text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.03)]"
                >
                  <FileText
                    size={15}
                    className="shrink-0"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{course.titre}</p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                    >
                      {new Date(course.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className="text-xs font-semibold shrink-0"
                    style={{ color: "#4ADE80" }}
                  >
                    Ready
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {state === "processing" && (
        <div
          className="rounded-2xl p-8"
          style={{
            background: "rgba(124,92,255,0.06)",
            border: "1px solid rgba(124,92,255,0.2)",
          }}
        >
          <div className="flex items-center gap-3 mb-7">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "rgba(124,92,255,0.18)",
                border: "1px solid rgba(124,92,255,0.3)",
              }}
            >
              <Sparkles size={17} style={{ color: "#A78BFA" }} className="animate-pulse" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white">
                Processing your material...
              </p>
              <p
                className="text-xs mt-0.5 truncate"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                {filename}
              </p>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span style={{ color: "rgba(255,255,255,0.4)" }}>
                {uploaded ? "Extracting text…" : "Uploading"}
              </span>
              <span className="font-bold" style={{ color: "#C4B5FD" }}>
                {Math.round(progress)}%
              </span>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, #7C5CFF, #00D9FF)",
                  transition: "width 0.35s ease-out",
                }}
              />
            </div>
          </div>

          <div className="space-y-3">
            {processingSteps.map(({ label, done }) => {
              return (
                <div key={label} className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all duration-300"
                    style={{
                      background: done ? "#22C55E" : "transparent",
                      border: done
                        ? "1px solid #22C55E"
                        : "1px solid rgba(255,255,255,0.2)",
                    }}
                  >
                    {done && (
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path
                          d="M1.5 4L3.5 6L6.5 2"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <span
                    className="text-sm transition-colors duration-300"
                    style={{
                      color: done
                        ? "rgba(255,255,255,0.85)"
                        : "rgba(255,255,255,0.28)",
                    }}
                  >
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {state === "generating" && (
        <div
          className="rounded-2xl p-8"
          style={{
            background: "rgba(0,217,255,0.04)",
            border: "1px solid rgba(0,217,255,0.15)",
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "rgba(0,217,255,0.12)",
                border: "1px solid rgba(0,217,255,0.25)",
              }}
            >
              <Sparkles size={17} style={{ color: "#00D9FF" }} className="animate-pulse" />
            </div>
            <div>
              <p className="font-bold text-white">Generating study materials...</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                This may take a few seconds
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Brain size={16} style={{ color: "#7C5CFF" }} className="animate-pulse" />
              <span className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                Creating quiz questions...
              </span>
            </div>
            <div className="flex items-center gap-3">
              <CreditCard size={16} style={{ color: "#F59E0B" }} className="animate-pulse" />
              <span className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                Generating flashcards...
              </span>
            </div>
            {retryingMsg && (
              <div className="flex items-center gap-3 mt-2">
                <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#FCD34D", borderTopColor: "transparent" }} />
                <span className="text-xs" style={{ color: "#FCD34D" }}>
                  {retryingMsg}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {state === "done" && (
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: "rgba(34,197,94,0.06)",
            border: "1px solid rgba(34,197,94,0.2)",
          }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: "rgba(34,197,94,0.14)",
              border: "1px solid rgba(34,197,94,0.28)",
            }}
          >
            <CheckCircle size={26} style={{ color: "#4ADE80" }} />
          </div>
          <h3 className="text-xl font-black text-white mb-1.5">
            Course ready!
          </h3>
          <p
            className="text-sm mb-4 truncate max-w-xs mx-auto"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            {titre || filename}
          </p>

          {/* Generation status */}
          <div className="mb-6 space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Brain size={14} style={{ color: quizError ? "#F87171" : "#4ADE80" }} />
              <span className="text-xs" style={{ color: quizError ? "#FCA5A5" : "#86EFAC" }}>
                {quizError ? `Quiz: ${quizError}` : "Quiz generated"}
              </span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <CreditCard size={14} style={{ color: flashcardError ? "#F87171" : "#4ADE80" }} />
              <span className="text-xs" style={{ color: flashcardError ? "#FCA5A5" : "#86EFAC" }}>
                {flashcardError ? `Flashcards: ${flashcardError}` : "Flashcards generated"}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={onBack}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 bg-[#7C5CFF] hover:bg-[#8B6BFF]"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => {
                setState("idle")
                setProgress(0)
                setFilename("")
                setTitre("")
                setQuizError(null)
                setFlashcardError(null)
                setRetryingMsg(null)
              }}
              className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[rgba(255,255,255,0.9)]"
            >
              Upload another
            </button>
          </div>
        </div>
      )}

      {state === "error" && (
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: "rgba(239,68,68,0.06)",
            border: "1px solid rgba(239,68,68,0.2)",
          }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: "rgba(239,68,68,0.14)",
              border: "1px solid rgba(239,68,68,0.28)",
            }}
          >
            <AlertCircle size={26} style={{ color: "#F87171" }} />
          </div>
          <h3 className="text-xl font-black text-white mb-1.5">
            Upload failed
          </h3>
          <p
            className="text-sm mb-7 max-w-xs mx-auto"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            {errorMessage}
          </p>

          <button
            onClick={() => {
              setState("idle")
              setProgress(0)
              setErrorMessage("")
            }}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 bg-[#7C5CFF] hover:bg-[#8B6BFF]"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}