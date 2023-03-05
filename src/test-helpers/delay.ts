/**
 * Delay for tests.
 */
export const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))
