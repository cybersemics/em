
/** Safely JSON parse an unknown value, and default to a given fallback value. */
export const parseJsonSafe = <T>(value: string | null, defaultValue: T): T => {
  try {
    return value && JSON.parse(value)
  }
  catch (e) {
    return defaultValue
  }
}
