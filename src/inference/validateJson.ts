/** Validates that a string is valid JSON and returns the parsed object. Returns null if invalid. */
const validateJson = (input: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(input)
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

export default validateJson
