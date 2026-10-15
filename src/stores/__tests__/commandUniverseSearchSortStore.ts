import { token } from '../../../styled-system/tokens'

describe('platform default sort order', () => {
  const desktopQuery = `(min-width: ${token('breakpoints.lg')})`

  /** Loads a fresh ministore module while the viewport does or does not match the lg breakpoint. */
  const loadStore = async (isDesktop: boolean) => {
    const matchMedia = window.matchMedia
    vi.spyOn(window, 'matchMedia').mockImplementation(query =>
      query === desktopQuery ? { ...matchMedia(query), matches: isDesktop } : matchMedia(query),
    )
    vi.resetModules()
    const { default: freshStore } = await import('../commandUniverseSearchSortStore')
    return freshStore
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts at Recently used when the app loads at the lg breakpoint and up', async () => {
    const freshStore = await loadStore(true)
    expect(freshStore.getState().sortOrder).toBe('recent')
  })

  it('starts at Type when the app loads below the lg breakpoint', async () => {
    const freshStore = await loadStore(false)
    expect(freshStore.getState().sortOrder).toBe('type')
  })
})
