/**
 * Tests for the device constants in src/browser.ts.
 *
 * `isTouch` and `isTablet` are module-level constants evaluated once at import, so every case has to
 * stub the globals and then re-import the module with `vi.resetModules()`. That is the same trap the
 * app has at runtime: emulating a device after page load does not change either value.
 */
import { token } from '../../styled-system/tokens'

/** The `lg` breakpoint in px, read from the same token the implementation compares against. */
const LG = parseInt(token('breakpoints.lg'))

/** Re-imports src/browser.ts against a stubbed screen size and pointer type. */
const importBrowserWith = async ({
  screenWidth,
  screenHeight,
  touch,
}: {
  screenWidth: number
  screenHeight: number
  touch: boolean
}) => {
  vi.stubGlobal('screen', { width: screenWidth, height: screenHeight })
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: touch && query === '(pointer: coarse)' }))
  vi.resetModules()
  return import('../browser')
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('isTablet', () => {
  it('is true for a touchscreen whose smaller screen dimension is at least lg', async () => {
    // iPad mini, the smallest tablet we care about
    const { isTablet } = await importBrowserWith({ screenWidth: 744, screenHeight: 1133, touch: true })
    expect(isTablet).toBe(true)
  })

  it('is true whichever way round the screen dimensions are reported', async () => {
    // the same device, reported rotated — the answer must not depend on orientation
    const { isTablet } = await importBrowserWith({ screenWidth: 1133, screenHeight: 744, touch: true })
    expect(isTablet).toBe(true)
  })

  it('is false for a phone held in landscape, whose long edge clears lg', async () => {
    // iPhone 17 Pro: 874pt wide in landscape, so a viewport-width test would call this a tablet.
    // min(874, 402) = 402 is what keeps it out.
    const { isTablet } = await importBrowserWith({ screenWidth: 874, screenHeight: 402, touch: true })
    expect(isTablet).toBe(false)
  })

  it('is false for a phone in portrait', async () => {
    const { isTablet } = await importBrowserWith({ screenWidth: 402, screenHeight: 874, touch: true })
    expect(isTablet).toBe(false)
  })

  it('is false for a non-touch device however large the screen', async () => {
    const { isTablet } = await importBrowserWith({ screenWidth: 1920, screenHeight: 1080, touch: false })
    expect(isTablet).toBe(false)
  })

  it('includes the lg breakpoint itself and excludes one pixel below it', async () => {
    const atBreakpoint = await importBrowserWith({ screenWidth: LG, screenHeight: 2000, touch: true })
    expect(atBreakpoint.isTablet).toBe(true)

    const belowBreakpoint = await importBrowserWith({ screenWidth: LG - 1, screenHeight: 2000, touch: true })
    expect(belowBreakpoint.isTablet).toBe(false)
  })
})
