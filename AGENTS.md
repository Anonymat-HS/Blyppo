# Kwizo

React + Vite + Tailwind CSS app (Supabase backend).

## Development Server

A Vite development server is **always running** on `$PORT` (default 8443). You don't need to start it manually.

- Preview URL: The user can access the running app through the preview panel
- Hot reload: Changes to source files are reflected immediately

## Key Files

- `src/App.tsx` - Main application component (routing between pages)
- `src/main.tsx` - React entry point
- `src/index.css` - Global styles and Tailwind CSS import
- `package.json` - Dependencies and scripts
- `vite.config.ts` - Vite configuration
- `.mise.toml` - Toolchain versions (Node.js, pnpm)

## Project Structure

- `src/pages/` - One file per screen (Landing, auth, Dashboard, Quiz, Flashcards, Progress, Profile, Upload)
- `src/components/layout/` - Layout chrome (Sidebar, AvatarMenu)
- `src/components/ui/` - Small shared UI pieces (ErrorState, SaveWarning)
- `src/lib/api/` - Typed data-access layer, the only place that queries Supabase tables
- `src/lib/supabase/` - Client, auth context (`useAuth`), edge-function calls
- `src/lib/utils/` - Pure helpers (quotes, streak stats, spaced repetition, quiz grading)
- `supabase/functions/_shared/` - Code shared by the Edge Functions (auth/CORS helpers, LLM layer)
- `supabase/migrations/` - SQL for existing databases (`schema.sql` is the fresh-install state)
- `src/hooks/` - Shared hooks (`useUserStats`)

## Conventions

- Import with the `@/` alias (e.g. `import { fetchCourses } from "@/lib/api"`).
- Screens never call `supabase.from(...)` directly — add a function to `src/lib/api/` instead.
- `src/lib/api/` functions throw on failure; screens catch and show `ErrorState` / `SaveWarning`.
- Navigation is hash-based (`#/quiz`), handled in `src/App.tsx` — no router dependency.
- Typecheck with `npx tsc --noEmit` (must pass before committing).

## Styling

This project uses **Tailwind CSS v4** for styling. Use Tailwind utility classes directly in JSX. Tailwind is loaded via the Vite plugin — no PostCSS config needed.
