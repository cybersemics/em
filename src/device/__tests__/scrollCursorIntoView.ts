import viewportStore from '../../stores/viewportStore'
import scrollCursorIntoView from '../scrollCursorIntoView'

afterEach(() => {
  Reflect.deleteProperty(window, 'visualViewport')
  Reflect.deleteProperty(window, 'scrollY')
  vi.restoreAllMocks()
})

// https://github.com/cybersemics/em/issues/5972
it('does not scroll to a cursor that is on screen when the visual viewport has a negative height after an app switch', () => {
  // after the app switcher's landscape snapshot, iOS reports innerHeight minus the landscape width (793 - 852) for the rest of the session
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: { height: -59 } })
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 795 })
  window.innerHeight = 793
  viewportStore.update({ layoutTreeTop: -193 })
  const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})

  // the cursor sits 243px from the top of the 793px screen
  scrollCursorIntoView(1231, 22.5)

  expect(scrollTo).not.toHaveBeenCalled()
})
