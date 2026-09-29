import { token } from '../../styled-system/tokens'

/** The `lg` breakpoint in px, read from the same token the implementation compares against. */
const LG = parseInt(token('breakpoints.lg'))

/** Re-imports src/platform.ts (and the viewportStore it reads) against a stubbed pointer type. */
const importBrowserWith = async (touch: boolean) => {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: touch && query === '(pointer: coarse)' }))
  vi.resetModules()
  const platform = await import('../platform')
  const { default: viewportStore } = await import('../stores/viewportStore')
  return { ...platform, viewportStore }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('isTablet', () => {
  it('is true for a touchscreen whose smaller viewport dimension is at least lg', async () => {
    // iPad mini, the smallest tablet we care about
    const { isTablet, viewportStore } = await importBrowserWith(true)
    viewportStore.update({ innerWidth: 744, innerHeight: 1133 })
    expect(isTablet()).toBe(true)
  })

  it('is true whichever way round the viewport dimensions are reported', async () => {
    // the same device, reported rotated — the answer must not depend on orientation
    const { isTablet, viewportStore } = await importBrowserWith(true)
    viewportStore.update({ innerWidth: 1133, innerHeight: 744 })
    expect(isTablet()).toBe(true)
  })

  it('is false for a phone held in landscape, whose long edge clears lg', async () => {
    // iPhone 17 Pro: 874pt wide in landscape, so a viewport-width test would call this a tablet.
    // min(874, 402) = 402 is what keeps it out.
    const { isTablet, viewportStore } = await importBrowserWith(true)
    viewportStore.update({ innerWidth: 874, innerHeight: 402 })
    expect(isTablet()).toBe(false)
  })

  it('is false for a phone in portrait', async () => {
    const { isTablet, viewportStore } = await importBrowserWith(true)
    viewportStore.update({ innerWidth: 402, innerHeight: 874 })
    expect(isTablet()).toBe(false)
  })

  it('is false for a non-touch device however large the viewport', async () => {
    const { isTablet, viewportStore } = await importBrowserWith(false)
    viewportStore.update({ innerWidth: 1920, innerHeight: 1080 })
    expect(isTablet()).toBe(false)
  })

  it('includes the lg breakpoint itself and excludes one pixel below it', async () => {
    const { isTablet, viewportStore } = await importBrowserWith(true)

    viewportStore.update({ innerWidth: LG, innerHeight: 2000 })
    expect(isTablet()).toBe(true)

    viewportStore.update({ innerWidth: LG - 1, innerHeight: 2000 })
    expect(isTablet()).toBe(false)
  })
})
