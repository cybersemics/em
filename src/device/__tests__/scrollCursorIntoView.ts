import viewportStore from '../../stores/viewport'
import scrollCursorIntoView from '../scrollCursorIntoView'

/** Viewport height used for the tests (approximately iPhone 15 Pro). */
const VIEWPORT_HEIGHT = 852

/** Appends an element with the given attributes to the document body and stubs its getBoundingClientRect. */
const appendElement = (attributes: Record<string, string>, rect: { top: number; height: number }): HTMLElement => {
  const el = document.createElement('div')
  Object.entries(attributes).forEach(([key, value]) => el.setAttribute(key, value))
  el.getBoundingClientRect = () =>
    ({
      top: rect.top,
      bottom: rect.top + rect.height,
      height: rect.height,
      left: 0,
      right: 0,
      width: 0,
      x: 0,
      y: rect.top,
      toJSON: () => ({}),
    }) as DOMRect
  document.body.appendChild(el)
  return el
}

let scrollToSpy: ReturnType<typeof vi.fn>

beforeEach(() => {
  document.body.innerHTML = ''

  // mock the viewport
  Object.defineProperty(window, 'innerHeight', { value: VIEWPORT_HEIGHT, configurable: true })
  Object.defineProperty(window, 'visualViewport', { value: { height: VIEWPORT_HEIGHT }, configurable: true })
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true })
  viewportStore.update({ layoutTreeTop: 0 })

  scrollToSpy = vi.fn()
  window.scrollTo = scrollToSpy as typeof window.scrollTo

  // toolbar at the top, navbar at the bottom
  appendElement({ id: 'toolbar' }, { top: 0, height: 50 })
  appendElement({ 'aria-label': 'nav' }, { top: VIEWPORT_HEIGHT - 50, height: 50 })
})

it('does not scroll a thought that is already within the visible viewport', () => {
  // a thought in the middle of the screen, with no Command Center open
  scrollCursorIntoView(400, 40)
  expect(scrollToSpy).not.toHaveBeenCalled()
})

it('scrolls a selected thought out from behind the Command Center', () => {
  // The Command Center sheet covers the bottom 70% of the screen during a multiselection.
  appendElement({ 'data-testid': 'command-menu-panel' }, { top: VIEWPORT_HEIGHT * 0.3, height: VIEWPORT_HEIGHT * 0.7 })

  // A thought at y=400 is "in view" by the navbar-only measurement, but is hidden behind the Command Center.
  // It should be scrolled up so that it lands above the Command Center. See #3995 Issue G.
  scrollCursorIntoView(400, 40)

  expect(scrollToSpy).toHaveBeenCalledTimes(1)
  const top = scrollToSpy.mock.calls[0][0].top as number
  // after scrolling, the thought's bottom should be above the top of the Command Center
  const thoughtBottomAfterScroll = 400 - top + 40
  expect(thoughtBottomAfterScroll).toBeLessThanOrEqual(VIEWPORT_HEIGHT * 0.3)
})
