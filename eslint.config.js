import js from "@eslint/js"
import tseslint from "typescript-eslint"
import reactHooks from "eslint-plugin-react-hooks"

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Loading data on mount sets state from an async callback: the pattern this
      // app is built on. The rule targets React Compiler patterns we do not use.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    // Edge Functions run on Deno, not in the browser
    files: ["supabase/functions/**/*.ts"],
    languageOptions: {
      globals: { Deno: "readonly", File: "readonly", FormData: "readonly", Request: "readonly", Response: "readonly", console: "readonly" },
    },
  },
)
