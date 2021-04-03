/**
 * Delay for tests.
 */
export const delay = (ms: number) => new Promise<boolean>(resolve => setTimeout(() => resolve(true), ms))
