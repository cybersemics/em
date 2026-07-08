import navigateBack from '../navigateBack'
import navigateForward from '../navigateForward'

/** Stubs window.navigation with the given capabilities and returns spies for back and forward. */
const stubNavigation = ({ canGoBack, canGoForward }: { canGoBack: boolean; canGoForward: boolean }) => {
  const back = vi.fn()
  const forward = vi.fn()
  window.navigation = { canGoBack, canGoForward, back, forward }
  return { back, forward }
}

/** Overrides window.history.length for the duration of a test and returns a restore function. */
const stubHistoryLength = (length: number) => {
  const descriptor = Object.getOwnPropertyDescriptor(window.history, 'length')
  Object.defineProperty(window.history, 'length', { configurable: true, get: () => length })
  return () => {
    if (descriptor) Object.defineProperty(window.history, 'length', descriptor)
  }
}

afterEach(() => {
  delete window.navigation
})

describe('navigateBack', () => {
  it('canExecute falls back to window.history.length when the Navigation API is unavailable', () => {
    delete window.navigation

    const restoreEmpty = stubHistoryLength(1)
    expect(navigateBack.canExecute!({} as never)).toBe(false)
    restoreEmpty()

    const restoreNonEmpty = stubHistoryLength(2)
    expect(navigateBack.canExecute!({} as never)).toBe(true)
    restoreNonEmpty()
  })

  it('canExecute mirrors window.navigation.canGoBack', () => {
    stubNavigation({ canGoBack: true, canGoForward: false })
    expect(navigateBack.canExecute!({} as never)).toBe(true)

    stubNavigation({ canGoBack: false, canGoForward: true })
    expect(navigateBack.canExecute!({} as never)).toBe(false)
  })

  it('exec navigates back in history', () => {
    const { back } = stubNavigation({ canGoBack: true, canGoForward: false })
    navigateBack.exec(vi.fn(), () => ({}) as never, {} as never, { type: 'keyboard' })
    expect(back).toHaveBeenCalledTimes(1)
  })

  it('exec falls back to window.history.back when the Navigation API is unavailable', () => {
    delete window.navigation
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {})
    navigateBack.exec(vi.fn(), () => ({}) as never, {} as never, { type: 'keyboard' })
    expect(back).toHaveBeenCalledTimes(1)
    back.mockRestore()
  })
})

describe('navigateForward', () => {
  it('canExecute falls back to window.history.length when the Navigation API is unavailable', () => {
    delete window.navigation

    const restoreEmpty = stubHistoryLength(1)
    expect(navigateForward.canExecute!({} as never)).toBe(false)
    restoreEmpty()

    const restoreNonEmpty = stubHistoryLength(2)
    expect(navigateForward.canExecute!({} as never)).toBe(true)
    restoreNonEmpty()
  })

  it('canExecute mirrors window.navigation.canGoForward', () => {
    stubNavigation({ canGoBack: false, canGoForward: true })
    expect(navigateForward.canExecute!({} as never)).toBe(true)

    stubNavigation({ canGoBack: true, canGoForward: false })
    expect(navigateForward.canExecute!({} as never)).toBe(false)
  })

  it('exec navigates forward in history', () => {
    const { forward } = stubNavigation({ canGoBack: false, canGoForward: true })
    navigateForward.exec(vi.fn(), () => ({}) as never, {} as never, { type: 'keyboard' })
    expect(forward).toHaveBeenCalledTimes(1)
  })

  it('exec falls back to window.history.forward when the Navigation API is unavailable', () => {
    delete window.navigation
    const forward = vi.spyOn(window.history, 'forward').mockImplementation(() => {})
    navigateForward.exec(vi.fn(), () => ({}) as never, {} as never, { type: 'keyboard' })
    expect(forward).toHaveBeenCalledTimes(1)
    forward.mockRestore()
  })
})
