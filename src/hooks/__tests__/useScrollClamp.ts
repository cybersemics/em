import { act, renderHook } from '@testing-library/react'
import useScrollClamp from '../useScrollClamp'

afterEach(() => {
  vi.restoreAllMocks()
})

/** Sets jsdom's read-only window scroll position. */
const setScrollY = (scrollY: number) => {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: scrollY })
}

/** Mocks native scrolling and synchronously emits its resulting scroll event. */
const mockWindowScrollTo = () =>
  vi.spyOn(window, 'scrollTo').mockImplementation((x: number, y: number) => {
    const firstArgument = x as number | ScrollToOptions
    setScrollY(typeof firstArgument === 'number' ? y : (firstArgument.top ?? 0))
    window.dispatchEvent(new Event('scroll'))
  })

/** Mounts the scroll clamp against fixed document geometry. */
const renderScrollClamp = () => {
  const layout = document.createElement('div')
  Object.defineProperty(layout, 'offsetTop', { configurable: true, value: 0 })
  Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 8000 })

  return renderHook(() =>
    useScrollClamp({
      layoutRef: { current: layout },
      visibleTop: 5000,
      visibleBottom: 5100,
      viewportHeight: 1000,
    }),
  )
}

it('corrects programmatic scrolling without adding an elastic offset', () => {
  setScrollY(0)
  const scrollTo = mockWindowScrollTo()
  const { result } = renderScrollClamp()

  act(() => window.dispatchEvent(new Event('scroll')))

  expect(scrollTo).toHaveBeenCalledWith({ top: 4010 })
  expect(result.current.get()).toBe(0)
})

it('retains resisted movement through the corrective scroll event during a touch', () => {
  setScrollY(4000)
  mockWindowScrollTo()
  const { result } = renderScrollClamp()

  act(() => {
    window.dispatchEvent(new Event('touchstart'))
    window.dispatchEvent(new Event('scroll'))
  })

  expect(window.scrollY).toBe(4010)
  expect(result.current.get()).toBeGreaterThan(0)
  expect(result.current.get()).toBeLessThan(80)
})
