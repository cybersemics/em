
/** Safely JSON parse an unknown value, and default to a given fallback value. */
export const parseJsonSafe = (value: string | null, defaultValue: any) => {
  try {
    return value && JSON.parse(value)
  }
  catch (e) {
    return defaultValue
  }
}
