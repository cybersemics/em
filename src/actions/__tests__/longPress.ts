import { importTextActionCreator as importText } from '../../actions/importText'
import { keyboardOpenActionCreator as keyboardOpen } from '../../actions/keyboardOpen'
import { longPressActionCreator as longPress } from '../../actions/longPress'
import { LongPressState } from '../../constants'
import { initialize } from '../../initialize'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

// The virtual keyboard is only dismissed on touch devices, so emulate a touch device for these tests.
vi.mock('../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../browser')>()
  return { ...actual, isTouch: true }
})

beforeEach(initStore)

it('closes the virtual keyboard when a drag begins (#4683)', async () => {
  await initialize()

  store.dispatch([
    importText({ text: '- a' }),
    setCursor(['a']),
    // simulate the keyboard being open on the focused thought
    keyboardOpen({ value: true }),
  ])

  expect(store.getState().isKeyboardOpen).toBe(true)

  // starting a drag should dismiss the keyboard
  store.dispatch(longPress({ value: LongPressState.DragInProgress }))

  expect(store.getState().isKeyboardOpen).toBe(false)
})
