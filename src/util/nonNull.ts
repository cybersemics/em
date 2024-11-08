/** Returns true if a value is non null and non undefined. */
const nonNull = <T>(value: T | null | undefined): value is T => value != null

export default nonNull
