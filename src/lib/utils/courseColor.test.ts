import { describe, expect, it } from "vitest"
import { courseColor, courseInitials } from "./courseColor"

describe("courseColor", () => {
  it("gives a course the same color every time", () => {
    expect(courseColor("c-123")).toBe(courseColor("c-123"))
  })

  it("returns a hex color", () => {
    expect(courseColor("anything")).toMatch(/^#[0-9A-F]{6}$/i)
  })
})

describe("courseInitials", () => {
  it("takes the first letter of the first two words", () => {
    expect(courseInitials("Network Basics")).toBe("NB")
    expect(courseInitials("rest api design")).toBe("RA")
  })

  it("takes two letters of a single word", () => {
    expect(courseInitials("Java")).toBe("JA")
  })

  it("ignores extra spaces and handles an empty title", () => {
    expect(courseInitials("  Data   Science ")).toBe("DS")
    expect(courseInitials("   ")).toBe("?")
  })
})
