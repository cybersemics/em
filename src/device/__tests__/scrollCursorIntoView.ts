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

it('scrolls a selected thought above the Command Center blur band so its text is readable', () => {
  // The Command Center sheet covers the bottom 70% of the screen during a multiselection.
  const commandCenterTop = VIEWPORT_HEIGHT * 0.3
  appendElement({ 'data-testid': 'command-menu-panel' }, { top: commandCenterTop, height: VIEWPORT_HEIGHT * 0.7 })

  // The blur element fades in over a 110px band above the solid panel top; a thought left within that band
  // would be blurred and unreadable. The thought should be scrolled fully above the blur band. See #3995 Issue G.
  const BLUR_FALLOFF = 110
  scrollCursorIntoView(400, 40)

  expect(scrollToSpy).toHaveBeenCalledTimes(1)
  const top = scrollToSpy.mock.calls[0][0].top as number
  // after scrolling, the thought's bottom should be above the top of the blur band (panel top - blur falloff)
  const thoughtBottomAfterScroll = 400 - top + 40
  expect(thoughtBottomAfterScroll).toBeLessThanOrEqual(commandCenterTop - BLUR_FALLOFF)
})

it('does not re-scroll a thought already visible above the Command Center panel (no jump)', () => {
  // The Command Center sheet covers the bottom 70% of the screen during a multiselection.
  const commandCenterTop = VIEWPORT_HEIGHT * 0.3
  appendElement({ 'data-testid': 'command-menu-panel' }, { top: commandCenterTop, height: VIEWPORT_HEIGHT * 0.7 })

  // A thought whose bottom sits just above the solid panel top is visible and must not be scrolled, otherwise
  // snapping the topmost selected thought into view jumps the page. The blur falloff is only applied to the
  // scroll *target*, not to the "needs scrolling" detection, so this thought stays put. See #3995 Issue F.
  scrollCursorIntoView(commandCenterTop - 60, 40)

  expect(scrollToSpy).not.toHaveBeenCalled()
})
