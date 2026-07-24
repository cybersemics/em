import { importTextActionCreator as importText } from '../../actions/importText'
import { longPressActionCreator as longPress } from '../../actions/longPress'
import { LongPressState } from '../../constants'
import { initialize } from '../../initialize'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

// selection.clear (which blurs the focused editable to close the keyboard) only runs on touch devices.
vi.mock('../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../browser')>()
  return { ...actual, isTouch: true }
})

beforeEach(initStore)

it('blurs the focused editable when a drag begins, so the virtual keyboard closes (#4683)', async () => {
  await initialize()

  store.dispatch([importText({ text: '- a' }), setCursor(['a'])])

  // focus an editable element to emulate the keyboard being open on the focused thought
  const editable = document.createElement('div')
  editable.setAttribute('contenteditable', 'true')
  editable.tabIndex = 0
  document.body.appendChild(editable)
  editable.focus()
  expect(document.activeElement).toBe(editable)

  // starting a drag (tap and hold) should blur the editable, which closes the keyboard
  store.dispatch(longPress({ value: LongPressState.DragHold }))

  expect(document.activeElement).not.toBe(editable)

  document.body.removeChild(editable)
})
