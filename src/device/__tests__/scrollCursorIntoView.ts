import viewportStore from '../../stores/viewport'
import virtualKeyboardStore from '../../stores/virtualKeyboardStore'
import scrollCursorIntoView from '../scrollCursorIntoView'

vi.mock('../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../browser')>()
  return { ...actual, isCapacitor: () => true, isSafari: () => true, isTouch: true }
})

/** Creates a DOMRect with the given vertical measurements. */
const createRect = ({ top, height }: { top: number; height: number }): DOMRect =>
  ({
    x: 0,
    y: top,
    top,
    right: 0,
    bottom: top + height,
    left: 0,
    width: 0,
    height,
    toJSON: () => ({}),
  }) as DOMRect

beforeEach(() => {
  document.body.innerHTML = ''
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 10 })
  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    value: { height: 800 },
  })
  Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 2000 })

  viewportStore.update({
    innerHeight: 800,
    layoutTreeTop: 0,
    virtualKeyboardHeight: 0,
  })
  virtualKeyboardStore.update({ open: false, height: 0, ...{ targetHeight: 0 } })

  const toolbar = document.createElement('div')
  toolbar.id = 'toolbar'
  toolbar.getBoundingClientRect = () => createRect({ top: 50, height: 50 })
  document.body.appendChild(toolbar)

  const navbar = document.createElement('nav')
  navbar.setAttribute('aria-label', 'nav')
  navbar.getBoundingClientRect = () => createRect({ top: 750, height: 50 })
  document.body.appendChild(navbar)

  window.scrollTo = vi.fn()
})

it('does not scroll while the cursor is inside the existing viewport bounds', () => {
  scrollCursorIntoView(200, 30)

  expect(window.scrollTo).not.toHaveBeenCalled()
})

it('preserves the existing top landing calculation', () => {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 300 })

  scrollCursorIntoView(350, 30)

  expect(window.scrollTo).toHaveBeenCalledWith({ top: 285, behavior: 'smooth' })
})

it('preserves the existing bottom landing calculation', () => {
  scrollCursorIntoView(780, 30)

  expect(window.scrollTo).toHaveBeenCalledWith({ top: 75, behavior: 'smooth' })
})

it('preserves the existing keyboard-open bottom landing calculation', () => {
  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    value: { height: 500 },
  })

  scrollCursorIntoView(600, 30)

  expect(window.scrollTo).toHaveBeenCalledWith({ top: 195, behavior: 'smooth' })
})

it('preserves the existing multiline bottom landing calculation', () => {
  scrollCursorIntoView(760, 60)

  expect(window.scrollTo).toHaveBeenCalledWith({ top: 100, behavior: 'smooth' })
})

it('preserves the existing instant behavior for a target more than one visible viewport away', () => {
  scrollCursorIntoView(1800, 30)

  expect(window.scrollTo).toHaveBeenCalledWith({ top: 1095, behavior: 'auto' })
})

// https://github.com/cybersemics/em/issues/3765
it('scrolls the cursor above the Capacitor keyboard when visualViewport does not resize', () => {
  // The spread keeps this regression test source-compatible with the pre-fix VirtualKeyboardState.
  virtualKeyboardStore.update({ open: true, height: 300, ...{ targetHeight: 300 } })

  scrollCursorIntoView(600, 30)

  expect(window.scrollTo).toHaveBeenCalledWith({ top: 195, behavior: 'smooth' })
})

it('does not scroll when the crossed edge has no reachable target', () => {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 1 })

  scrollCursorIntoView(50, 30)

  expect(window.scrollTo).not.toHaveBeenCalled()
})

it('clamps the bottom target to the end of the document', () => {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 1100 })

  scrollCursorIntoView(2000, 30)

  expect(window.scrollTo).toHaveBeenCalledWith({ top: 1200, behavior: 'smooth' })
})
