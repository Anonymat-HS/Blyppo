# Revizo

> Turn your course material into AI-generated quizzes and flashcards for active learning.

Revizo is an AI-powered study tool that transforms course notes, slides, and documents into interactive revision resources. It solves the problem of passive, time-consuming revision by automating the creation of practice materials and pushing students towards active recall — the method proven to be most effective for long-term retention. 

Born out of a personal need — revising networking, Java, and API development coursework as a first-year CS student — Revizo is designed to grow into a tool usable by any student or institution.

## Features

- **Upload course material** (PDF, TXT, or Markdown) to generate study resources
- **AI-generated quizzes** with multiple-choice questions and explanations
- **AI-generated flashcards** with spaced-repetition rating (new/hard/good/easy)
- **Active recall practice** through interactive quiz and flashcard sessions
- **Progress tracking** — streak, average score, course breakdown, and weekly activity
- **Personal dashboard** to organize and access all generated courses and resources
- **User profiles & authentication** with Supabase Auth
- **Swappable LLM provider** — Gemini, Groq (default), or Ollama
- **Dark mode UI** with violet accent theme
- **Responsive** — works seamlessly on mobile and desktop
- **Freemium-ready** — question/card limits per plan

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 8 + TypeScript + Tailwind CSS v4 |
| UI Icons | Lucide React |
| Charts | Recharts |
| Routing | Local screen state (no router) |
| Backend | Supabase Edge Functions (Deno) |
| Database & Auth | Supabase (PostgreSQL + Row Level Security) |
| AI / LLM | Groq API (`llama-3.3-70b-versatile`) via abstraction layer (Gemini, Groq, Ollama) |
| PDF Parsing | `unpdf` (Deno-compatible) |

## Project Structure

```
src/
  App.tsx                # Main app with routing/state and auth flow
  main.tsx               # React entry point
  index.css              # Global styles and Tailwind CSS import
  pages/                 # Screen components (Landing, Login, Signup, CompleteProfile, Dashboard, Upload, Quiz, Flashcards, Progress, Profile)
  components/
    layout/              # Layout chrome (Sidebar, AvatarMenu)
    ui/                  # Small shared UI pieces (ErrorState, SaveWarning)
  hooks/                 # Shared hooks (useUserStats)
  lib/
    api/                 # Typed data-access layer (only place that queries Supabase tables)
    supabase/            # Client, auth context (useAuth), edge-function calls
    types.ts             # Shared TypeScript interfaces
    utils/               # Pure helpers (quotes, streak stats, spaced repetition, quiz grading)

supabase/
  schema.sql             # Full DB schema + RLS + indexes (fresh install)
  storage.sql            # Avatars bucket + policies
  migrations/            # SQL to run on a database created with an older schema
  functions/
    extract-course/      # PDF/TXT/MD → text extraction
    generate-quiz/       # LLM → quiz questions → DB
    generate-flashcards/ # LLM → flashcards → DB
    delete-account/      # Deletes the caller's account and data
    _shared/http.ts      # CORS, auth and error helpers shared by the functions
    _shared/llm/         # LLM abstraction: prompts, text sampling, output validation, providers
```

## How It Works

1. **Upload** – Students upload their course material (PDF, TXT, or Markdown) through the Upload screen.
2. **Extract & Generate** – Supabase Edge Functions extract the content and use an LLM to automatically generate quizzes and flashcards.
3. **Practice Actively** – Students practice using the Quiz and Flashcards interfaces, engaging in active recall rather than passive reading.
4. **Track Progress** – The Progress dashboard and `useUserStats` hook track streaks, scores, and performance across courses to keep students motivated.

## Getting Started

```bash
git clone https://github.com/Anonymat-HS/Revizo.git
cd Revizo
pnpm install
cp .env.example .env
# Configure VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, LLM_PROVIDER, GROQ_API_KEY
pnpm dev
```

### Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` then `supabase/storage.sql` in the SQL Editor
   (existing database: run the files in `supabase/migrations/` instead)
3. Deploy the Edge Functions with the CLI — they import `_shared/`, which the Dashboard editor cannot bundle:
   `supabase functions deploy extract-course generate-quiz generate-flashcards delete-account --project-ref <ref>`
4. Set secrets: `supabase secrets set LLM_PROVIDER=groq GROQ_API_KEY=<your-key> --project-ref <ref>`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key |
| `LLM_PROVIDER` | `gemini`, `groq`, or `ollama` |
| `GROQ_API_KEY` | Groq API key (if using Groq) |
| `GROQ_MODEL` | Optional. Groq model id (default `openai/gpt-oss-120b`) |
| `GEMINI_API_KEY` | Gemini API key (if using Gemini) |
| `OLLAMA_URL` | Ollama endpoint (if using Ollama) |
| `LLM_MAX_INPUT_WORDS` | Optional. Words of course text sent to the LLM (default 2200) |
| `ALLOWED_ORIGINS` | Comma-separated app origins allowed to call the functions (e.g. `https://my-app.vercel.app`). Unset = any origin, for development only |

## Plans and limits

Upload size, daily course quota and generation sizes are per plan. They live in
the `plans` table (`supabase/migrations/003_plans.sql`), so they change with an
`UPDATE` and need no redeploy.

| Plan | Max file | Courses / 24 h | Questions / quiz | Cards / deck |
|---|---|---|---|---|
| `free` | 20 MB | 10 | 20 | 30 |
| `premium` | 50 MB | 50 | 30 | 60 |
| `business` | 100 MB | 200 | 40 | 80 |
| `bold` | 200 MB | 500 | 50 | 100 |

A user with no row in `user_plans` is on `free`. Assigning a plan is a
service-role write (billing or an admin), never a client one:

```sql
insert into user_plans (user_id, plan)
select id, 'premium' from auth.users where email = 'user@example.com'
on conflict (user_id) do update set plan = excluded.plan, updated_at = now();
```

The seeded numbers are placeholders; adjust them per plan with `update plans`.
Limits are enforced server-side only: the Upload page displays them but the
Edge Functions are the authority.

Still common to every plan: one generation per course, text-based PDFs only
(no scans), 2200 words of course text sent to the LLM.

## Project Context

See [`PROJECT.md`](./PROJECT.md) for the full architecture, database schema, LLM prompts, freemium plans, and detailed roadmap.

See [`ROADMAP.md`](./ROADMAP.md) for the development progress tracker.

## License

MIT
