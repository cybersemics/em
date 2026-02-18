/** Generic type that validates a string contains only characters from a given charset. */
type StringOf<S extends string, Charset extends string> = S extends ''
  ? S
  : S extends `${infer First}${infer Rest}`
    ? First extends Charset
      ? `${First}${StringOf<Rest, Charset>}`
      : never
    : never

/** Valid swipe direction characters. */
type SwipeChar = 'l' | 'r' | 'u' | 'd'

/**
 * A gesture string that can only contain valid swipe characters (l, r, u, d) or be empty.
 * Validates string literals at compile-time to ensure they only contain valid gesture characters.
 *
 * When used without a type parameter, accepts any string.
 * When used with a literal type parameter, validates the string contains only valid characters.
 *
 * @example
 * type Good = Gesture<'lrd'>;  // OK: 'lrd'
 * type Bad = Gesture<'xyz'>;   // Error: never
 * const gesture: Gesture = 'lrd';  // OK at runtime
 * const empty: Gesture = '';  // OK at runtime
 */
type Gesture<S extends string = string> = [S] extends [string]
  ? string extends S
    ? string
    : StringOf<S, SwipeChar> | ''
  : StringOf<S, SwipeChar> | ''

export default Gesture
