let t1 = Date.now() // eslint-disable-line fp/no-let

// enable logging for debugging
const enableLogging = false

/** Measures and prints the time since its last call (seconds). Used for debugging. */
export const logWithTime = (...args: any[]) => {

  if (!enableLogging) return

  const t2 = Date.now()
  const diff = (t2 - t1) / 1000
  t1 = t2
  console.info(diff, ...args)
}
