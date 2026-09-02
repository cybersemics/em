import focusWithoutAutoscroll from '../focusWithoutAutoscroll'
import * as selection from '../selection'

vi.mock('../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../browser')>()
  return { ...actual, isSafari: () => true, isTouch: true }
})

vi.mock('../selection', () => ({
  isThought: vi.fn(),
  offsetThought: vi.fn(() => null),
  set: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(selection.set).mockReset()
  Object.defineProperty(window, 'scrollX', { configurable: true, value: 0 })
  Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 100 })
  window.scrollTo = vi.fn()
})

// https://github.com/cybersemics/em/issues/3765
it('prevents focus and selection from changing the iOS scroll position', () => {
  const editable = document.createElement('div')
  editable.setAttribute('contenteditable', 'true')
  const focus = vi.spyOn(editable, 'focus')
  vi.mocked(selection.set).mockImplementation(() => {
    window.scrollY = 400
  })

  focusWithoutAutoscroll(editable, { offset: 3 })

  expect(focus).toHaveBeenCalledWith({ preventScroll: true })
  expect(selection.set).toHaveBeenCalledWith(editable, { offset: 3 })
  expect(window.scrollTo).toHaveBeenCalledWith(0, 100)
})
