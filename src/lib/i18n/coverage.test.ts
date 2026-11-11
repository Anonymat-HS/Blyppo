import { describe, expect, it } from "vitest"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { FR } from "./translate"

/** Every .ts / .tsx file under src, tests excluded. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : []
  })
}

describe("French coverage", () => {
  it("has a French translation for every t(\"...\") used in the app", () => {
    const missing: string[] = []
    for (const file of sourceFiles(join(import.meta.dirname, "../.."))) {
      const code = readFileSync(file, "utf8")
      // t("..."), with escaped quotes allowed inside
      for (const match of code.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) {
        const key = JSON.parse(`"${match[1]}"`) as string
        if (!(key in FR)) missing.push(`${file.split("/src/")[1]}: ${key}`)
      }
    }
    expect(missing).toEqual([])
  })
})
