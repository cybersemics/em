/**
 * A repeatable sequence of random numbers from 0 to 1, the same every time for the same seed (mulberry32). A scripted
 * flight uses it for its sparkles, so it draws the same picture every time, and so does a test, so it counts the same
 * sparkles on every run.
 */
const seededRandom = (seed: number) => {
  // The generator's position in its sequence, advanced on every call.
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export default seededRandom
