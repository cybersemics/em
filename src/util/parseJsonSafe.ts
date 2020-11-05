// Most specific overload must come first
// See: https://www.typescriptlang.org/docs/handbook/functions.html
export function parseJsonSafe<T>(value: string | null, defaultValue: T): T
export function parseJsonSafe(value: string | null): unknown

/** Safely JSON parse an unknown value, and default to a given fallback value. */
export function parseJsonSafe<T>(value: string | null, defaultValue?: T): any {
  try {
    return value && JSON.parse(value)
  }
  catch (e) {
    return defaultValue
  }
}
