import { ArrowRight, Upload, Sparkles, Brain, CheckCircle } from "lucide-react"

export default function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <div
      className="min-h-screen text-white overflow-x-hidden"
      style={{ background: "#0F0F12" }}
    >
      {/* Nav */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src="/android-chrome-192x192.png"
            alt="StudyForge"
            className="w-10 h-10 rounded-xl"
          />
          <span className="font-black text-lg tracking-tight">StudyForge</span>
        </div>

        <div
          className="hidden md:flex items-center gap-8 text-sm"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          <a
            href="#features"
            className="hover:text-white transition-colors duration-150"
          >
            Features
          </a>
          <a
            href="#pricing"
            className="hover:text-white transition-colors duration-150"
          >
            Pricing
          </a>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onEnter}
            className="hidden sm:block text-sm transition-colors duration-150"
            style={{ color: "rgba(255,255,255,0.5)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "rgba(255,255,255,0.9)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "rgba(255,255,255,0.5)")
            }
          >
            Sign in
          </button>
          <button
            onClick={onEnter}
            className="px-4 py-2 text-sm font-semibold rounded-xl text-white transition-all duration-200"
            style={{ background: "#7C5CFF" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#8B6BFF"
              e.currentTarget.style.boxShadow = "0 0 20px rgba(124,92,255,0.4)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#7C5CFF"
              e.currentTarget.style.boxShadow = "none"
            }}
          >
            Get started free
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
              background: "rgba(124,92,255,0.1)",
              border: "1px solid rgba(124,92,255,0.28)",
              color: "#C4B5FD",
            }}
          >
            <Sparkles size={13} />
            AI-powered learning, reimagined
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-[72px] font-black leading-[1.0] tracking-tighter mb-6">
            Upload your notes.
            <br />
            <span
              style={{
                background:
                  "linear-gradient(135deg, #ffffff 0%, #C4B5FD 45%, #7C5CFF 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Master any subject.
            </span>
          </h1>

          <p
            className="text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10"
            style={{ color: "rgba(255,255,255,0.48)" }}
          >
            StudyForge reads your PDFs and lecture notes, then instantly
            generates targeted quizzes and spaced-repetition flashcards — built
            for students who actually want to learn.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-5">
            <button
              onClick={onEnter}
              className="group flex items-center gap-2 px-8 py-3.5 rounded-2xl font-semibold text-white transition-all duration-200"
              style={{ background: "#7C5CFF" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#8B6BFF"
                e.currentTarget.style.boxShadow =
                  "0 0 36px rgba(124,92,255,0.45)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#7C5CFF"
                e.currentTarget.style.boxShadow = "none"
              }}
            >
              Start for free
              <ArrowRight
                size={17}
                className="group-hover:translate-x-0.5 transition-transform"
              />
            </button>
            <button
              onClick={onEnter}
              className="flex items-center gap-2 px-8 py-3.5 rounded-2xl font-medium transition-all duration-200"
              style={{
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.6)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)"
                e.currentTarget.style.color = "rgba(255,255,255,0.9)"
                e.currentTarget.style.background = "rgba(255,255,255,0.04)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"
                e.currentTarget.style.color = "rgba(255,255,255,0.6)"
                e.currentTarget.style.background = "transparent"
              }}
            >
              See how it works
            </button>
          </div>

          <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
            No credit card required · Free during beta
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
                  MY COURSES
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
                        {name}
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
                    AI-GENERATED QUIZ · ALGORITHMS
                  </p>
                  <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                    3 / 5
                  </span>
                </div>
                <div className="h-1 rounded-full mb-4" style={{ background: "rgba(255,255,255,0.07)" }}>
                  <div className="h-full rounded-full w-3/5" style={{ background: "#7C5CFF" }} />
                </div>
                <p className="text-sm font-semibold mb-3" style={{ color: "rgba(255,255,255,0.85)" }}>
                  What is the average-case complexity of quicksort?
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
              background: "rgba(0,217,255,0.1)",
              border: "1px solid rgba(0,217,255,0.25)",
              color: "#00D9FF",
              backdropFilter: "blur(8px)",
            }}
          >
            <Sparkles size={13} />
            42 questions generated in 4s
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-14">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mb-3">
            How it works
          </h2>
          <p className="text-base sm:text-lg" style={{ color: "rgba(255,255,255,0.38)" }}>
            From raw notes to exam-ready in three steps
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {[
            {
              step: "01",
              icon: Upload,
              title: "Upload your materials",
              desc: "Drop in any PDF, Word doc, or paste lecture notes directly. StudyForge supports all major academic formats.",
              color: "#7C5CFF",
            },
            {
              step: "02",
              icon: Sparkles,
              title: "AI generates your content",
              desc: "Our model reads your material and instantly creates targeted quiz questions and spaced-repetition flashcard decks.",
              color: "#00D9FF",
            },
            {
              step: "03",
              icon: Brain,
              title: "Study smarter, retain more",
              desc: "Take quizzes, flip flashcards, and track your progress as StudyForge adapts to your learning patterns over time.",
              color: "#22C55E",
            },
          ].map(({ step, icon: Icon, title, desc, color }) => (
            <div
              key={step}
              className="relative p-6 rounded-2xl transition-all duration-200 group"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.045)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.025)"
              }}
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
              <h3 className="text-base font-bold mb-2">{title}</h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                {desc}
              </p>
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
            Free during beta
          </div>
          <h2 className="text-2xl sm:text-3xl font-black mb-3">
            StudyForge is free right now
          </h2>
          <p style={{ color: "rgba(255,255,255,0.45)" }}>
            No credit card, no hidden fees. We're building this for students first — pricing details coming soon.
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
            Ready to study smarter?
          </h2>
          <p className="mb-8" style={{ color: "rgba(255,255,255,0.45)" }}>
            Upload your first course and get a quiz and flashcards in minutes.
          </p>
          <button
            onClick={onEnter}
            className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl font-semibold text-white transition-all duration-200"
            style={{ background: "#7C5CFF" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#8B6BFF"
              e.currentTarget.style.boxShadow = "0 0 36px rgba(124,92,255,0.45)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#7C5CFF"
              e.currentTarget.style.boxShadow = "none"
            }}
          >
            Start for free
            <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img
              src="/android-chrome-192x192.png"
              alt="StudyForge"
              className="w-9 h-9 rounded-lg"
            />
            <span className="font-black text-sm">StudyForge</span>
          </div>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.28)" }}>
            © 2026 StudyForge. Built for serious learners.
          </p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.18)" }}>
            Crafted with care by <span style={{ color: "rgba(124,92,255,0.5)" }}>H.S Company</span>
          </p>
          <div className="flex gap-6 text-sm" style={{ color: "rgba(255,255,255,0.28)" }}>
            {["Privacy", "Terms", "Contact"].map((l) => (
              <a
                key={l}
                href="#"
                className="hover:text-white transition-colors duration-150"
              >
                {l}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
