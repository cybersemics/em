import DragThoughtZone from '../../@types/DragThoughtZone'
import { importTextActionCreator as importText } from '../../actions/importText'
import { keyboardOpenActionCreator as keyboardOpen } from '../../actions/keyboardOpen'
import { LongPressState } from '../../constants'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import { longPressActionCreator as longPress } from '../longPress'

// isTouch is read by longPressActionCreator to gate the keyboard dismissal to touch devices.
// Mocking isTouch is safe here because no component is rendered (see repo note on TraceGesture).
vi.mock('../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../browser')>()
  return { ...actual, isTouch: true }
})

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => 'ios',
    isNativePlatform: () => false,
    isPluginAvailable: () => false,
  },
}))

vi.mock('@capacitor/keyboard', () => ({
  Keyboard: {
    hide: () => Promise.resolve(),
    addListener: () => Promise.resolve({ remove: () => {} }),
    removeAllListeners: () => Promise.resolve(),
  },
}))

beforeEach(initStore)

it('dismisses the keyboard when a drag gesture begins on touch (DragHold)', () => {
  // put the cursor on a thought with the keyboard open
  store.dispatch([importText({ text: '- a' }), setCursor(['a']), keyboardOpen({ value: true })])
  expect(store.getState().isKeyboardOpen).toBe(true)

  // a long press activates the drag (DragHold) without any drag movement
  store.dispatch(longPress({ value: LongPressState.DragHold, sourceZone: DragThoughtZone.Thoughts }))

  // the keyboard should be dismissed as soon as the drag gesture begins
  expect(store.getState().isKeyboardOpen).toBe(false)
})

it('does not dismiss the keyboard on a re-dispatch of the same drag state', () => {
  store.dispatch([importText({ text: '- a' }), setCursor(['a'])])

  // enter the drag gesture
  store.dispatch(longPress({ value: LongPressState.DragHold, sourceZone: DragThoughtZone.Thoughts }))
  expect(store.getState().longPress).toBe(LongPressState.DragHold)

  // re-open the keyboard, then re-dispatch DragInProgress twice; the second (same-state) dispatch must not
  // re-dismiss the keyboard, otherwise every hover re-dispatch would fight the keyboard
  store.dispatch(longPress({ value: LongPressState.DragInProgress }))
  store.dispatch(keyboardOpen({ value: true }))
  store.dispatch(longPress({ value: LongPressState.DragInProgress }))

  expect(store.getState().isKeyboardOpen).toBe(true)
})
