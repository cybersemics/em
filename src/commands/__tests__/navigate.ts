import navigateBack from '../navigateBack'
import navigateForward from '../navigateForward'

/** Stubs window.navigation with the given capabilities and returns spies for back and forward. */
const stubNavigation = ({ canGoBack, canGoForward }: { canGoBack: boolean; canGoForward: boolean }) => {
  const back = vi.fn()
  const forward = vi.fn()
  window.navigation = { canGoBack, canGoForward, back, forward }
  return { back, forward }
}

afterEach(() => {
  delete window.navigation
})

describe('navigateBack', () => {
  it('canExecute is false when the Navigation API is unavailable', () => {
    delete window.navigation
    expect(navigateBack.canExecute!({} as never)).toBe(false)
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
})

describe('navigateForward', () => {
  it('canExecute is false when the Navigation API is unavailable', () => {
    delete window.navigation
    expect(navigateForward.canExecute!({} as never)).toBe(false)
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
})
