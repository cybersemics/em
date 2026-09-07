import { desktopCommandUniverseActionCreator as desktopCommandUniverse } from '../../actions/desktopCommandUniverse'
import * as selection from '../../device/selection'
import globals from '../../globals'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import initEvents from '../initEvents'

const stateChangeListenerRef = vi.hoisted(
  () =>
    ({
      current: null as
        | null
        | ((event: { oldState: 'active' | 'passive' | 'hidden'; newState: 'active' | 'passive' | 'hidden' }) => void),
    }) as {
      current:
        | null
        | ((event: { oldState: 'active' | 'passive' | 'hidden'; newState: 'active' | 'passive' | 'hidden' }) => void)
    },
)

vi.mock('page-lifecycle', () => ({
  default: {
    addEventListener: vi.fn((eventName: string, listener: typeof stateChangeListenerRef.current) => {
      if (eventName === 'statechange') {
        stateChangeListenerRef.current = listener
      }
    }),
    removeEventListener: vi.fn((eventName: string, listener: typeof stateChangeListenerRef.current) => {
      if (eventName === 'statechange' && stateChangeListenerRef.current === listener) {
        stateChangeListenerRef.current = null
      }
    }),
  },
}))

vi.mock('../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../browser')>()
  return { ...actual, isTouch: true, isSafari: () => true }
})

vi.mock('../../device/selection', async importOriginal => {
  const actual = await importOriginal<typeof import('../../device/selection')>()
  return { ...actual, clear: vi.fn() }
})

beforeEach(async () => {
  await initStore()
})

afterEach(() => {
  initEvents(store).cleanup()
  globals.suppressCursorAfterTouch = false
})

it('allows cursor events again when a new touch starts', () => {
  initEvents(store)
  globals.suppressCursorAfterTouch = true

  window.dispatchEvent(new TouchEvent('touchstart'))

  expect(globals.suppressCursorAfterTouch).toBe(false)
})

// https://github.com/cybersemics/em/issues/1596
it('keeps desktop command universe open when the app is hidden and restored', () => {
  initEvents(store)

  store.dispatch(desktopCommandUniverse())
  expect(store.getState().showDesktopCommandUniverse).toBe(true)
  expect(stateChangeListenerRef.current).toBeTruthy()

  stateChangeListenerRef.current!({
    oldState: 'active',
    newState: 'hidden',
  })
  stateChangeListenerRef.current!({
    oldState: 'hidden',
    newState: 'active',
  })

  expect(store.getState().showDesktopCommandUniverse).toBe(true)
})

// Clear Thought moves the caret through a hidden input (asyncFocus), which briefly leaves nothing focused and thus
// triggers an active -> passive transition. On iOS Capacitor document.hasFocus() is false after a native
// drag-and-drop, so the app switch heuristic misfired and cleared the caret the command had just placed, taking the
// faux carets and the keyboard with it.
// https://github.com/cybersemics/em/pull/4520#issuecomment-5288476536
it('does not clear the selection when the app becomes passive with nothing focused', async () => {
  initEvents(store)
  const hasFocus = vi.spyOn(document, 'hasFocus').mockReturnValue(false)

  stateChangeListenerRef.current!({ oldState: 'active', newState: 'passive' })
  await vi.advanceTimersByTimeAsync(50)

  expect(selection.clear).not.toHaveBeenCalled()
  hasFocus.mockRestore()
})

// https://github.com/cybersemics/em/issues/1468
it('clears the selection when the app becomes passive while a thought is focused', async () => {
  initEvents(store)
  const editable = document.createElement('input')
  document.body.appendChild(editable)
  editable.focus()
  const hasFocus = vi.spyOn(document, 'hasFocus').mockReturnValue(false)

  stateChangeListenerRef.current!({ oldState: 'active', newState: 'passive' })
  await vi.advanceTimersByTimeAsync(50)

  expect(selection.clear).toHaveBeenCalled()
  hasFocus.mockRestore()
  editable.remove()
})
