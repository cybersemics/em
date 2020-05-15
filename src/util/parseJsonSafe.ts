//@ts-nocheck

/** Safely JSON parse an unknown value, and default to a given fallback value. */
export const parseJsonSafe = (value, defaultValue) => {
  let parsedValue = defaultValue // eslint-disable-line fp/no-let
  try {
    parsedValue = JSON.parse(value)
  }
  catch (e) {
  }
  return parsedValue
}
