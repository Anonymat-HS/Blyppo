import { ArrowRight, Upload, Sparkles, Brain, CheckCircle, Zap, CalendarClock, Target, Flame, Keyboard } from "lucide-react"
import { CompanyBadge, Logo } from "@/components/ui/Logo"
import LanguageSwitch from "@/components/ui/LanguageSwitch"
import { useT } from "@/lib/i18n"

export default function Landing({ onEnter }: { onEnter: () => void }) {
  const { t } = useT()
  return (
    <div
      className="min-h-screen text-white overflow-x-hidden"
      style={{ background: "#0F0F12" }}
    >
      {/* Nav */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
        <Logo size="md" byline />

        <div
          className="hidden md:flex items-center gap-8 text-sm"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          <a
            href="#features"
            className="hover:text-white transition-colors duration-150"
          >
            {t("Features")}
          </a>
          <a
            href="#pricing"
            className="hover:text-white transition-colors duration-150"
          >
            {t("Pricing")}
          </a>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitch />
          <button
            onClick={onEnter}
            className="hidden sm:block text-sm transition-colors duration-150 text-[rgba(255,255,255,0.5)] hover:text-[rgba(255,255,255,0.9)]"
          >
            {t("Sign in")}
          </button>
          <button
            onClick={onEnter}
            className="whitespace-nowrap px-3 sm:px-4 py-2 text-sm font-semibold rounded-xl text-white transition-all duration-200 bg-[#7C5CFF] hover:bg-[#8B6BFF] hover:shadow-[0_0_20px_rgba(124,92,255,0.4)]"
          >
            <span className="sm:hidden">{t("Start")}</span>
            <span className="hidden sm:inline">{t("Get started free")}</span>
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-12 text-center relative">
        {/* Ambient glow */}
        <div
          className="absolute inset-x-0 top-0 pointer-events-none"
          style={{
            height: "480px",
            background:
              "radial-gradient(ellipse 800px 400px at 50% -50px, rgba(124,92,255,0.12), transparent)",
          }}
        />

        <div className="relative">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium mb-8"
            style={{
              background: "rgba(255,200,61,0.1)",
              border: "1px solid rgba(255,200,61,0.3)",
              color: "#FFD873",
            }}
          >
            <Zap size={13} />
            {t("Your notes in, a quiz out")}
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-[72px] font-black leading-[1.0] tracking-tighter mb-6">
            {t("Quiz yourself.")}
            <br />
            <span
              style={{
                background:
                  "linear-gradient(135deg, #FFD873 0%, #C4B5FD 50%, #7C5CFF 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {t("Ace the exam.")}
            </span>
          </h1>

          <p
            className="text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10"
            style={{ color: "rgba(255,255,255,0.48)" }}
          >
            {t("Blyppo turns your PDFs and lecture notes into quizzes and flashcards. Answer, see what you missed, and come back tomorrow to keep your streak alive.")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-5">
            <button
              onClick={onEnter}
              className="group flex items-center gap-2 px-8 py-3.5 rounded-2xl font-semibold text-white transition-all duration-200 bg-[#7C5CFF] hover:bg-[#8B6BFF] hover:shadow-[0_0_36px_rgba(124,92,255,0.45)]"
            >
              {t("Start my first quiz")}
              <ArrowRight
                size={17}
                className="group-hover:translate-x-0.5 transition-transform"
              />
            </button>
            <a
              href="#features"
              className="flex items-center gap-2 px-8 py-3.5 rounded-2xl font-medium transition-all duration-200 border border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.6)] hover:border-[rgba(255,255,255,0.22)] hover:text-[rgba(255,255,255,0.9)] hover:bg-[rgba(255,255,255,0.04)]"
            >
              {t("See how it works")}
            </a>
          </div>

          <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
            {t("No credit card required · Free during beta")}
          </p>
        </div>

        {/* Mock UI */}
        <div className="relative mt-14 max-w-4xl mx-auto">
          <div
            className="rounded-2xl p-5 text-left"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,92,255,0.08)",
            }}
          >
            {/* Window chrome */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full" style={{ background: "rgba(239,68,68,0.5)" }} />
              <div className="w-3 h-3 rounded-full" style={{ background: "rgba(245,158,11,0.5)" }} />
              <div className="w-3 h-3 rounded-full" style={{ background: "rgba(34,197,94,0.5)" }} />
              <div className="flex-1 mx-4 h-5 rounded-md" style={{ background: "rgba(255,255,255,0.04)" }} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Sidebar mock */}
              <div
                className="col-span-1 rounded-xl p-4 hidden md:block"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <p className="text-[10px] font-semibold mb-3" style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>
                  {t("MY COURSES")}
                </p>
                {[
                  { name: "Algorithms", color: "#7C5CFF", pct: 78 },
                  { name: "Chemistry", color: "#00D9FF", pct: 45 },
                  { name: "Economics", color: "#F59E0B", pct: 92 },
                ].map(({ name, color, pct }) => (
                  <div key={name} className="mb-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-5 h-5 rounded-md" style={{ background: color + "25", border: `1px solid ${color}35` }} />
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                        {t(name)}
                      </span>
                    </div>
                    <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Quiz mock */}
              <div
                className="col-span-2 rounded-xl p-4"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>
                    {t("AI-GENERATED QUIZ · ALGORITHMS")}
                  </p>
                  <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                    3 / 5
                  </span>
                </div>
                <div className="h-1 rounded-full mb-4" style={{ background: "rgba(255,255,255,0.07)" }}>
                  <div className="h-full rounded-full w-3/5" style={{ background: "#7C5CFF" }} />
                </div>
                <p className="text-sm font-semibold mb-3" style={{ color: "rgba(255,255,255,0.85)" }}>
                  {t("What is the average-case complexity of quicksort?")}
                </p>
                <div className="space-y-2">
                  {[
                    { label: "O(n)", correct: false, selected: false },
                    { label: "O(n log n)", correct: true, selected: true },
                    { label: "O(n²)", correct: false, selected: false },
                    { label: "O(log n)", correct: false, selected: false },
                  ].map(({ label, correct }) => (
                    <div
                      key={label}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                      style={
                        correct
                          ? { background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", color: "#86EFAC" }
                          : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }
                      }
                    >
                      {correct && <CheckCircle size={11} className="shrink-0" />}
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Floating badge */}
          <div
            className="hidden sm:flex absolute -bottom-4 right-8 px-4 py-2 rounded-xl text-sm font-semibold items-center gap-2"
            style={{
              background: "rgba(255,200,61,0.1)",
              border: "1px solid rgba(255,200,61,0.3)",
              color: "#FFC83D",
              backdropFilter: "blur(8px)",
            }}
          >
            <Flame size={13} />
            {t("5-day streak · keep it going")}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-14">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mb-3">
            {t("How it works")}
          </h2>
          <p className="text-base sm:text-lg" style={{ color: "rgba(255,255,255,0.38)" }}>
            {t("From raw notes to exam-ready in three steps")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {[
            {
              step: "01",
              icon: Upload,
              title: "Upload your materials",
              desc: "Drop in a PDF, a text file or Markdown notes. One course, one upload.",
              color: "#7C5CFF",
            },
            {
              step: "02",
              icon: Sparkles,
              title: "Get a quiz and a deck",
              desc: "Blyppo reads your material and writes quiz questions and flashcards straight from it, not from the internet.",
              color: "#00D9FF",
            },
            {
              step: "03",
              icon: Keyboard,
              title: "Play, miss, retry",
              desc: "Answer with 1-4 on the keyboard, review your mistakes, and let the flashcards come back when you need them.",
              color: "#22C55E",
            },
          ].map(({ step, icon: Icon, title, desc, color }) => (
            <div
              key={step}
              className="relative p-6 rounded-2xl transition-all duration-200 group bg-[rgba(255,255,255,0.025)] border border-[rgba(255,255,255,0.07)] hover:bg-[rgba(255,255,255,0.045)]"
            >
              <div className="flex items-start gap-4 mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: color + "1A", border: `1px solid ${color}2E` }}
                >
                  <Icon size={18} style={{ color }} />
                </div>
                <span
                  className="text-5xl font-black mt-0.5 select-none"
                  style={{ color: "rgba(255,255,255,0.05)" }}
                >
                  {step}
                </span>
              </div>
              <h3 className="text-base font-bold mb-2">{t(title)}</h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                {t(desc)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Why it works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mb-3">
            {t("Why a quiz beats re-reading")}
          </h2>
          <p className="text-base sm:text-lg max-w-2xl mx-auto" style={{ color: "rgba(255,255,255,0.38)" }}>
            {t("Highlighting feels productive, but memory is built by pulling answers out of your head. That is exactly what a quiz does.")}
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            {
              icon: Brain,
              title: "Answer first",
              desc: "Every question makes you commit to an answer before you see the solution.",
              color: "#7C5CFF",
            },
            {
              icon: CalendarClock,
              title: "Spaced repetition",
              desc: "Cards return on a schedule that follows how well you knew them.",
              color: "#00D9FF",
            },
            {
              icon: Target,
              title: "Learn from misses",
              desc: "At the end of a quiz, review the questions you missed with the right answer.",
              color: "#F59E0B",
            },
          ].map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="p-6 rounded-2xl text-left bg-[rgba(255,255,255,0.025)] border border-[rgba(255,255,255,0.07)]">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: color + "1A", border: `1px solid ${color}2E` }}
              >
                <Icon size={18} style={{ color }} />
              </div>
              <h3 className="text-base font-bold mb-2">{t(title)}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{t(desc)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
        <div
          className="max-w-xl mx-auto p-8 sm:p-10 rounded-3xl"
          style={{
            background: "rgba(34,197,94,0.05)",
            border: "1px solid rgba(34,197,94,0.15)",
          }}
        >
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-5"
            style={{
              background: "rgba(34,197,94,0.12)",
              border: "1px solid rgba(34,197,94,0.25)",
              color: "#4ADE80",
            }}
          >
            {t("Free during beta")}
          </div>
          <h2 className="text-2xl sm:text-3xl font-black mb-3">
            {t("Blyppo is free right now")}
          </h2>
          <p style={{ color: "rgba(255,255,255,0.45)" }}>
            {t("No credit card, no hidden fees. We're building this for students first — pricing details coming soon.")}
          </p>
        </div>
      </section>

      {/* CTA section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
        <div
          className="max-w-2xl mx-auto p-6 sm:p-10 rounded-3xl"
          style={{
            background: "rgba(124,92,255,0.07)",
            border: "1px solid rgba(124,92,255,0.2)",
          }}
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black mb-3">
            {t("Your first quiz is one upload away")}
          </h2>
          <p className="mb-8" style={{ color: "rgba(255,255,255,0.45)" }}>
            {t("Upload your first course and get a quiz and flashcards in minutes.")}
          </p>
          <button
            onClick={onEnter}
            className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl font-semibold text-white transition-all duration-200 bg-[#7C5CFF] hover:bg-[#8B6BFF] hover:shadow-[0_0_36px_rgba(124,92,255,0.45)]"
          >
            {t("Start for free")}
            <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex flex-col items-center gap-5 text-center">
          <Logo size="md" byline />
          <CompanyBadge label="Designed and built by" />
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
            {t("© 2026 Blyppo, a product of H.S. All rights reserved.")}
          </p>
        </div>
      </footer>
    </div>
  )
}
