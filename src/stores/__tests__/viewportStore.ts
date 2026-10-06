import { token } from '../../../styled-system/tokens'
import { resetStores } from '../ministore'
import viewportStore, { updateSize } from '../viewportStore'

/** The `lg` breakpoint in px, read from the same token the implementation compares against. */
const LG = parseInt(token('breakpoints.lg'))

/** Re-imports viewportStore against a stubbed pointer type, since `isTouch` is evaluated once at import. */
const importViewportStoreWith = async (touch: boolean) => {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: touch && query === '(pointer: coarse)' }))
  vi.resetModules()
  const { default: viewportStore, isTablet } = await import('../viewportStore')
  return { isTablet, viewportStore }
}

/** Simulates the virtual keyboard by shrinking the visual viewport, or restores jsdom's lack of one. */
const setKeyboardHeight = (height: number | null) => {
  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    value: height === null ? undefined : { height: window.innerHeight - height },
  })
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  setKeyboardHeight(null)
  vi.useRealTimers()
})

// https://github.com/cybersemics/em/issues/5256
it('does not write a keyboard height measured before a reset back into the store after it', () => {
  const initialHeight = viewportStore.getState().virtualKeyboardHeight

  setKeyboardHeight(300)
  updateSize()
  vi.advanceTimersByTime(20)
  expect(viewportStore.getState().virtualKeyboardHeight).toBe(300)

  resetStores()

  setKeyboardHeight(0)
  updateSize()
  vi.advanceTimersByTime(20)
  expect(viewportStore.getState().virtualKeyboardHeight).toBe(initialHeight)
})

it('reports the last measured keyboard height after the keyboard closes', () => {
  setKeyboardHeight(300)
  updateSize()
  vi.advanceTimersByTime(20)

  setKeyboardHeight(0)
  updateSize()
  vi.advanceTimersByTime(20)

  expect(viewportStore.getState().virtualKeyboardHeight).toBe(300)
})

it('recalculates the scroll zone width when the viewport changes', () => {
  window.innerWidth = 400
  window.innerHeight = 800

  updateSize()

  // a quarter of the smaller dimension
  expect(viewportStore.getState().scrollZoneWidth).toBe(100)
})

describe('isTablet', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('is true for a touchscreen whose smaller viewport dimension is at least lg', async () => {
    // iPad mini, the smallest tablet we care about
    const { isTablet, viewportStore } = await importViewportStoreWith(true)
    viewportStore.update({ innerWidth: 744, innerHeight: 1133 })
    expect(isTablet()).toBe(true)
  })

  it('is true whichever way round the viewport dimensions are reported', async () => {
    // the same device, reported rotated — the answer must not depend on orientation
    const { isTablet, viewportStore } = await importViewportStoreWith(true)
    viewportStore.update({ innerWidth: 1133, innerHeight: 744 })
    expect(isTablet()).toBe(true)
  })

  it('is false for a phone held in landscape, whose long edge clears lg', async () => {
    // iPhone 17 Pro: 874pt wide in landscape, so a viewport-width test would call this a tablet.
    // min(874, 402) = 402 is what keeps it out.
    const { isTablet, viewportStore } = await importViewportStoreWith(true)
    viewportStore.update({ innerWidth: 874, innerHeight: 402 })
    expect(isTablet()).toBe(false)
  })

  it('is false for a phone in portrait', async () => {
    const { isTablet, viewportStore } = await importViewportStoreWith(true)
    viewportStore.update({ innerWidth: 402, innerHeight: 874 })
    expect(isTablet()).toBe(false)
  })

  it('is false for a non-touch device however large the viewport', async () => {
    const { isTablet, viewportStore } = await importViewportStoreWith(false)
    viewportStore.update({ innerWidth: 1920, innerHeight: 1080 })
    expect(isTablet()).toBe(false)
  })

  it('includes the lg breakpoint itself and excludes one pixel below it', async () => {
    const { isTablet, viewportStore } = await importViewportStoreWith(true)

    viewportStore.update({ innerWidth: LG, innerHeight: 2000 })
    expect(isTablet()).toBe(true)

    viewportStore.update({ innerWidth: LG - 1, innerHeight: 2000 })
    expect(isTablet()).toBe(false)
  })
})
