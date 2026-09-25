import { importTextActionCreator as importText } from '../../../../actions/importText'
import { keyboardOpenActionCreator as keyboardOpen } from '../../../../actions/keyboardOpen'
import store from '../../../../stores/app'
import virtualKeyboardStore from '../../../../stores/virtualKeyboardStore'
import initStore from '../../../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../../../test-helpers/setCursorFirstMatch'
import * as selection from '../../../selection'
import androidCapacitorHandler from '../androidCapacitorHandler'

/** Captures the native keyboard listeners registered by the handler so the test can invoke them. */
const mockKeyboardListeners: Record<string, () => void> = {}
const mockTrackerListeners: Record<
  string,
  (event: { phase: string; height: number; shownHeight: number; navigationInset: number; timestampMs?: number }) => void
> = {}
const mockState = vi.hoisted(() => ({ trackerAvailable: false }))
const mockHide = vi.fn(() => Promise.resolve())

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => 'android',
    isNativePlatform: () => true,
    isPluginAvailable: (name: string) => name === 'Keyboard' || mockState.trackerAvailable,
  },
  registerPlugin: () => ({
    addListener: (
      event: string,
      callback: (data: {
        phase: string
        height: number
        shownHeight: number
        navigationInset: number
        timestampMs?: number
      }) => void,
    ) => {
      mockTrackerListeners[event] = callback
      return Promise.resolve({ remove: () => {} })
    },
    removeAllListeners: () => Promise.resolve(),
  }),
}))

vi.mock('@capacitor/keyboard', () => ({
  Keyboard: {
    addListener: (event: string, callback: () => void) => {
      mockKeyboardListeners[event] = callback
      return Promise.resolve({ remove: () => {} })
    },
    hide: () => mockHide(),
    removeAllListeners: () => Promise.resolve(),
  },
}))

beforeEach(async () => {
  await initStore()
  mockState.trackerAvailable = false
  mockHide.mockClear()
  document.documentElement.style.removeProperty('--virtual-keyboard-height')
})

it('exits edit mode when the native keyboard hides (e.g. Android Down Arrow)', () => {
  // put the cursor on a thought with the keyboard open
  store.dispatch([importText({ text: '- a' }), setCursor(['a']), keyboardOpen({ value: true })])
  expect(store.getState().isKeyboardOpen).toBe(true)

  androidCapacitorHandler.init()

  // the handler should subscribe to the native keyboardDidHide event
  expect(mockKeyboardListeners.keyboardDidHide).toBeDefined()

  // simulate the virtual keyboard being dismissed without a blur (e.g. via the Android Down Arrow button)
  mockKeyboardListeners.keyboardDidHide()

  // edit mode should be exited now that the keyboard is closed
  expect(store.getState().isKeyboardOpen).toBe(false)
})

// A range torn down while the keyboard is going away makes Android rebuild the text context menu, so it flashes back
// after it has already gone. keyboardWillHide is the last signal that arrives while the keyboard is still up.
// https://github.com/cybersemics/em/issues/4833
it('collapses a selected range before the native keyboard starts hiding', () => {
  store.dispatch([importText({ text: '- Cybersemics Institute' }), setCursor(['Cybersemics Institute'])])

  const editable = document.createElement('div')
  editable.setAttribute('contenteditable', 'true')
  editable.textContent = 'Cybersemics Institute'
  document.body.appendChild(editable)
  editable.focus()
  selection.setRange(editable, { start: 0, end: 'Cybersemics'.length })
  expect(selection.text()).toBe('Cybersemics')

  androidCapacitorHandler.init()

  // the handler should subscribe to the native keyboardWillHide event, which fires while the keyboard is still up
  expect(mockKeyboardListeners.keyboardWillHide).toBeDefined()

  mockKeyboardListeners.keyboardWillHide()

  // the range is gone, so the context menu has nothing left to display
  expect(selection.isCollapsed()).toBe(true)
  // the thought keeps the caret, so the menu's dismissal does not overlap the keyboard's
  expect(document.activeElement).toBe(editable)

  document.body.removeChild(editable)
})

it('exits edit mode when the tracked keyboard closes without a preceding blur', () => {
  mockState.trackerAvailable = true
  store.dispatch([importText({ text: '- a' }), setCursor(['a']), keyboardOpen({ value: true })])

  const editable = document.createElement('div')
  editable.setAttribute('contenteditable', 'true')
  editable.textContent = 'a'
  document.body.appendChild(editable)
  editable.focus()

  androidCapacitorHandler.init()
  const progress = mockTrackerListeners.keyboardProgress
  expect(progress).toBeDefined()

  progress({ phase: 'willShow', height: 0, shownHeight: 0, navigationInset: 39 })
  progress({ phase: 'progress', height: 160, shownHeight: 320, navigationInset: 39 })
  expect(document.documentElement.style.getPropertyValue('--virtual-keyboard-height')).toBe('160px')
  progress({ phase: 'didShow', height: 320, shownHeight: 320, navigationInset: 39 })
  expect(virtualKeyboardStore.getState().open).toBe(true)

  selection.setRange(editable, { start: 0, end: 1 })
  progress({ phase: 'willHide', height: 320, shownHeight: 320, navigationInset: 39 })
  progress({ phase: 'progress', height: 100, shownHeight: 320, navigationInset: 39 })
  expect(selection.isCollapsed()).toBe(true)
  expect(document.activeElement).toBe(editable)
  expect(store.getState().isKeyboardOpen).toBe(true)
  expect(document.documentElement.style.getPropertyValue('--virtual-keyboard-height')).toBe('100px')

  progress({ phase: 'didHide', height: 0, shownHeight: 320, navigationInset: 39 })
  expect(store.getState().isKeyboardOpen).toBe(false)
  expect(virtualKeyboardStore.getState().open).toBe(false)
  expect(document.documentElement.style.getPropertyValue('--virtual-keyboard-height')).toBe('0px')
  document.body.removeChild(editable)
  androidCapacitorHandler.destroy()
})

it('tracks the visible keyboard edge after an empty-space tap blurs the editable', () => {
  mockState.trackerAvailable = true
  store.dispatch([importText({ text: '- a' }), setCursor(['a']), keyboardOpen({ value: true })])

  const editable = document.createElement('div')
  editable.setAttribute('contenteditable', 'true')
  editable.textContent = 'a'
  document.body.appendChild(editable)
  editable.focus()

  androidCapacitorHandler.init()
  const progress = mockTrackerListeners.keyboardProgress
  progress({ phase: 'willShow', height: 0, shownHeight: 0, navigationInset: 39, timestampMs: 0 })
  progress({ phase: 'didShow', height: 320, shownHeight: 320, navigationInset: 39, timestampMs: 100 })

  editable.blur()
  expect(document.activeElement).not.toBe(editable)
  progress({ phase: 'willHide', height: 320, shownHeight: 320, navigationInset: 39, timestampMs: 200 })
  expect(document.documentElement.style.getPropertyValue('--virtual-keyboard-height')).toBe('320px')
  progress({ phase: 'progress', height: 280, shownHeight: 320, navigationInset: 39, timestampMs: 210 })
  expect(document.documentElement.style.getPropertyValue('--virtual-keyboard-height')).toBe('280px')
  progress({ phase: 'progress', height: 100, shownHeight: 320, navigationInset: 39, timestampMs: 220 })
  expect(document.documentElement.style.getPropertyValue('--virtual-keyboard-height')).toBe('100px')
  progress({ phase: 'didHide', height: 0, shownHeight: 320, navigationInset: 39, timestampMs: 230 })
  expect(document.documentElement.style.getPropertyValue('--virtual-keyboard-height')).toBe('0px')
  expect(store.getState().isKeyboardOpen).toBe(false)

  document.body.removeChild(editable)
  androidCapacitorHandler.destroy()
})

it('keeps raw geometry available without extrapolating bridge samples', () => {
  mockState.trackerAvailable = true
  androidCapacitorHandler.init()
  const progress = mockTrackerListeners.keyboardProgress

  progress({ phase: 'willShow', height: 0, shownHeight: 0, navigationInset: 39, timestampMs: 100 })
  progress({ phase: 'progress', height: 100, shownHeight: 320, navigationInset: 39, timestampMs: 110 })
  expect(document.documentElement.style.getPropertyValue('--virtual-keyboard-height')).toBe('100px')
  progress({ phase: 'progress', height: 200, shownHeight: 320, navigationInset: 39, timestampMs: 120 })
  expect(document.documentElement.style.getPropertyValue('--virtual-keyboard-height')).toBe('200px')
  progress({ phase: 'progress', height: 220, shownHeight: 320, navigationInset: 39, timestampMs: 120 })
  expect(document.documentElement.style.getPropertyValue('--virtual-keyboard-height')).toBe('220px')
  progress({ phase: 'didShow', height: 320, shownHeight: 320, navigationInset: 39, timestampMs: 130 })
  expect(document.documentElement.style.getPropertyValue('--virtual-keyboard-height')).toBe('320px')

  androidCapacitorHandler.destroy()
})

it('keeps raw keyboard geometry monotonic when native progress slows', () => {
  mockState.trackerAvailable = true
  androidCapacitorHandler.init()
  const progress = mockTrackerListeners.keyboardProgress

  progress({ phase: 'willShow', height: 390, shownHeight: 425, navigationInset: 39, timestampMs: 0 })
  progress({ phase: 'progress', height: 392, shownHeight: 425, navigationInset: 39, timestampMs: 9 })
  progress({ phase: 'progress', height: 395, shownHeight: 425, navigationInset: 39, timestampMs: 17 })
  const precedingHeight = parseFloat(document.documentElement.style.getPropertyValue('--virtual-keyboard-height'))
  progress({ phase: 'progress', height: 396, shownHeight: 425, navigationInset: 39, timestampMs: 25 })
  const currentHeight = parseFloat(document.documentElement.style.getPropertyValue('--virtual-keyboard-height'))
  expect(currentHeight).toBeGreaterThanOrEqual(precedingHeight)

  progress({ phase: 'didShow', height: 425, shownHeight: 425, navigationInset: 39, timestampMs: 33 })
  expect(document.documentElement.style.getPropertyValue('--virtual-keyboard-height')).toBe('425px')
  androidCapacitorHandler.destroy()
})
