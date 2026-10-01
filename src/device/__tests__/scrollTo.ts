import scheduleScrollCursorIntoView from '../scheduleScrollCursorIntoView'
import scrollTo from '../scrollTo'

/** A cursor position far below the viewport, so that a cursor scroll would move the page. */
const cursorSize = () => ({ y: 5000, height: 20 })

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  scheduleScrollCursorIntoView.cancel()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

it('scrolls to a given scrollTop', () => {
  const windowScrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})

  scrollTo(120)

  expect(windowScrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 120, left: 0 }))
})

it('lets a queued cursor scroll fire when nothing supersedes it', () => {
  const windowScrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})

  scheduleScrollCursorIntoView(cursorSize)
  vi.advanceTimersByTime(1000)

  expect(windowScrollTo).toHaveBeenCalledTimes(1)
  expect(windowScrollTo).not.toHaveBeenCalledWith(expect.objectContaining({ top: 0 }))
})

// https://github.com/cybersemics/em/issues/5257
it('supersedes a scroll the cursor had queued', () => {
  const windowScrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})

  scheduleScrollCursorIntoView(cursorSize)
  scrollTo('top')
  vi.advanceTimersByTime(1000)

  expect(windowScrollTo).toHaveBeenCalledTimes(1)
  expect(windowScrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }))
})
