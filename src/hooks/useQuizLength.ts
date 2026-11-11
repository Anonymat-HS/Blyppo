import { useState } from "react"
import { SESSION_SIZE } from "@/lib/utils/quiz"

export const QUIZ_LENGTHS = [5, 10, 20] as const
export type QuizLength = (typeof QUIZ_LENGTHS)[number]

const KEY = "kwizo.quizLength"

function read(): QuizLength {
  try {
    const n = Number(localStorage.getItem(KEY))
    return (QUIZ_LENGTHS as readonly number[]).includes(n) ? (n as QuizLength) : (SESSION_SIZE as QuizLength)
  } catch {
    // Storage blocked (private mode): fall back to the default
    return SESSION_SIZE as QuizLength
  }
}

/** Questions per quiz session, remembered on this device. */
export function useQuizLength(): [QuizLength, (n: QuizLength) => void] {
  const [length, setLength] = useState<QuizLength>(read)
  const update = (n: QuizLength) => {
    setLength(n)
    try {
      localStorage.setItem(KEY, String(n))
    } catch {
      // Not remembered, still applied for this visit
    }
  }
  return [length, update]
}
