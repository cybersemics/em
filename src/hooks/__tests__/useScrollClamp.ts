import { act, renderHook } from '@testing-library/react'
import useScrollClamp from '../useScrollClamp'

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
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
const renderScrollClamp = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const layout = document.createElement('div')
  Object.defineProperty(layout, 'offsetTop', { configurable: true, value: 0 })
  Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 8000 })

  return renderHook(() =>
    useScrollClamp({
      layoutRef: { current: layout },
      visibleTop: 5000,
      visibleBottom: 5100,
      viewportHeight: 1000,
      enabled,
    }),
  )
}

it('leaves native scrolling unchanged when there is no hidden ancestor space', () => {
  setScrollY(0)
  const scrollTo = mockWindowScrollTo()
  const { result } = renderScrollClamp({ enabled: false })

  act(() => {
    setScrollY(-20)
    window.dispatchEvent(new Event('scroll'))
  })

  expect(scrollTo).not.toHaveBeenCalled()
  expect(window.scrollY).toBe(-20)
  expect(result.current.get()).toBe(0)
})

it('corrects programmatic scrolling without adding an elastic offset', () => {
  setScrollY(0)
  const scrollTo = mockWindowScrollTo()
  const { result } = renderScrollClamp()

  act(() => window.dispatchEvent(new Event('scroll')))

  expect(scrollTo).toHaveBeenCalledWith({ top: 4010 })
  expect(result.current.get()).toBe(0)
})

it('allows scrolling past the lower clamp to reach the footer', () => {
  const footer = document.createElement('footer')
  footer.setAttribute('aria-label', 'footer')
  vi.spyOn(footer, 'getBoundingClientRect').mockReturnValue({
    bottom: 1100,
    height: 200,
    left: 0,
    right: 1000,
    top: 900,
    width: 1000,
    x: 0,
    y: 900,
    toJSON: () => ({}),
  })
  document.body.appendChild(footer)
  setScrollY(5100)
  const scrollTo = mockWindowScrollTo()
  renderScrollClamp()

  act(() => window.dispatchEvent(new Event('scroll')))

  expect(scrollTo).not.toHaveBeenCalled()
  expect(window.scrollY).toBe(5100)
})

it('does not animate a tap that did not overscroll', () => {
  const { result } = renderScrollClamp()
  const onChange = vi.fn()
  const unsubscribe = result.current.on('change', onChange)

  act(() => {
    window.dispatchEvent(new Event('touchstart'))
    window.dispatchEvent(new Event('touchend'))
  })

  expect(onChange).not.toHaveBeenCalled()
  unsubscribe()
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
