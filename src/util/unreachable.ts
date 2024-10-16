/** TypeScript helper to assert that a statement is unreachable. Particularly useful in switch statements. */
class UnreachableError extends Error {
  constructor(value: never) {
    super(`Invalid unreachable assertion: ${value}`)
  }
}

export default UnreachableError
