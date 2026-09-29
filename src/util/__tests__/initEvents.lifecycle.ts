import { desktopCommandUniverseActionCreator as desktopCommandUniverse } from '../../actions/desktopCommandUniverse'
import { longPressActionCreator as longPress } from '../../actions/longPress'
import { LongPressState } from '../../constants'
import * as selection from '../../device/selection'
import store from '../../stores/app'
import { resetStores } from '../../stores/ministore'
import scrollContainerStore from '../../stores/scrollContainerStore'
import touchStore from '../../stores/touchStore'
import initStore from '../../test-helpers/initStore'
import debugLog from '../debugLog'
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
})

it('allows cursor events again when a new touch starts', () => {
  initEvents(store)
  touchStore.update({ suppressCursorAfterTouch: true })

  window.dispatchEvent(new TouchEvent('touchstart'))

  expect(touchStore.getState().suppressCursorAfterTouch).toBe(false)
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

// The nav bar was reported drawn mid-screen after returning to the app, and the debug log held nothing about the viewport to show whether iOS had left it at the keyboard-open size.
it('logs the viewport geometry when the app resumes and again once it settles', async () => {
  initEvents(store)
  debugLog.setEnabled(true)
  debugLog.clear()

  stateChangeListenerRef.current!({ oldState: 'hidden', newState: 'passive' })
  stateChangeListenerRef.current!({ oldState: 'passive', newState: 'active' })
  await vi.advanceTimersByTimeAsync(1000)

  const viewportEntries = debugLog.read().filter(entry => entry.type === 'viewport')
  expect(viewportEntries.map(entry => entry.reason)).toEqual(['resume', 'settled'])
  expect(viewportEntries[0]).toMatchObject({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    clientHeight: document.documentElement.clientHeight,
    isKeyboardOpen: store.getState().isKeyboardOpen,
  })
})

it('logs a viewport resize only when the geometry changes', () => {
  initEvents(store)
  debugLog.setEnabled(true)
  debugLog.clear()

  window.dispatchEvent(new Event('resize'))
  window.dispatchEvent(new Event('resize'))

  const viewportEntries = debugLog.read().filter(entry => entry.type === 'viewport')
  expect(viewportEntries.map(entry => entry.reason)).toEqual(['resize'])
})

// https://github.com/cybersemics/em/issues/5255
it('does not clear the selection after cleanup when the passive-state timer was armed before it', async () => {
  const { cleanup } = initEvents(store)
  const editable = document.createElement('input')
  document.body.appendChild(editable)
  editable.focus()
  const hasFocus = vi.spyOn(document, 'hasFocus').mockReturnValue(false)
  vi.mocked(selection.clear).mockClear()

  stateChangeListenerRef.current!({ oldState: 'active', newState: 'passive' })
  cleanup()
  await vi.advanceTimersByTimeAsync(50)

  expect(selection.clear).not.toHaveBeenCalled()
  hasFocus.mockRestore()
  editable.remove()
})

describe('scroll-at-edge container', () => {
  /** Drags a thought over the given element, near enough to the top edge to start scroll-at-edge. */
  const dragOver = (target: HTMLElement) => {
    store.dispatch(longPress({ value: LongPressState.DragInProgress }))
    // jsdom implements neither Touch nor touch lists, so the one touch the handler reads is defined on the event.
    const event = new TouchEvent('touchmove', { bubbles: true })
    Object.defineProperty(event, 'touches', { value: [{ clientX: 10, clientY: 10 }] })
    target.dispatchEvent(event)
  }

  // https://github.com/cybersemics/em/issues/5255
  it('releases the element it was scrolling when the drag ends', () => {
    initEvents(store)
    const toolbar = document.createElement('div')
    toolbar.setAttribute('data-scroll-at-edge', '')
    document.body.appendChild(toolbar)

    dragOver(toolbar)
    expect(scrollContainerStore.getState().element).toBe(toolbar)

    window.dispatchEvent(new TouchEvent('touchend'))
    expect(scrollContainerStore.getState().element).toBe(window)
    toolbar.remove()
  })

  // https://github.com/cybersemics/em/issues/5255
  it('is back to the window after a reset', () => {
    initEvents(store)
    const toolbar = document.createElement('div')
    toolbar.setAttribute('data-scroll-at-edge', '')
    document.body.appendChild(toolbar)

    dragOver(toolbar)
    resetStores()

    expect(scrollContainerStore.getState().element).toBe(window)
    toolbar.remove()
  })
})
