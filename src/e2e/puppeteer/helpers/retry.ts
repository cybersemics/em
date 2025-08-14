import sleep from '../../../util/sleep'

/** Executes the given async effect up to `attempts` times with a delay between attempts. */
const retry = async <T>(
  effect: (attempt: number) => Promise<T>,
  {
    attempts = 2,
    delayMs = 0,
  }: {
    attempts?: number
    delayMs?: number
  } = {},
): Promise<T> => {
  /** Actual function that executes. */
  const attempt = async (n: number): Promise<T> => {
    try {
      return await effect(n)
    } catch (e) {
      if (n >= attempts) throw e
      if (delayMs > 0) await sleep(delayMs)
      return attempt(n + 1)
    }
  }

  return attempt(1)
}

export default retry
