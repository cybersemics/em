import { PreloadedTestFlags } from './preloadTestFlags'

/** The flags preloaded into the page of every test in the current describe block. Read by setup before it starts the app. */
let flags: PreloadedTestFlags = {}

/** Returns the flags that setup preloads into the page of the current test. */
export const suiteTestFlags = (): PreloadedTestFlags => flags

/** Preloads test flags into the page of every test in the calling describe block or file, before setup starts the app, so that a flag read once at startup needs no reload. */
const useTestFlags = (suiteFlags: PreloadedTestFlags): void => {
  let previous: PreloadedTestFlags = {}

  beforeAll(() => {
    previous = flags
    flags = { ...flags, ...suiteFlags }
  })

  afterAll(() => {
    flags = previous
  })
}

export default useTestFlags
