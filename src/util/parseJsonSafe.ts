import { Nullable } from '../utilTypes'

/** Safely JSON parse an unknown value, and default to a given fallback value. */
export const parseJsonSafe = (value: Nullable<string>, defaultValue: any) => {
  let parsedValue = defaultValue // eslint-disable-line fp/no-let
  try {
    parsedValue = value && JSON.parse(value)
  }
  catch (e) {
    // console.log(e)
  }
  return parsedValue
}
