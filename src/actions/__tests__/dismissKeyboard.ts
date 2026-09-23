import { dismissKeyboardActionCreator as dismissKeyboard } from '../../actions/dismissKeyboard'
import { importTextActionCreator as importText } from '../../actions/importText'
import { keyboardOpenActionCreator as keyboardOpen } from '../../actions/keyboardOpen'
import * as selection from '../../device/selection'
import { initialize } from '../../initialize'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

beforeEach(initStore)

it('dismisses a lingering text selection when the keyboard hides after edit mode has already ended (#4833)', async () => {
  await initialize({ storage: 'memory' })

  store.dispatch([
    importText({ text: '- Cybersemics Institute' }),
    setCursor(['Cybersemics Institute']),
    keyboardOpen({ value: false }),
  ])

  // emulate the browser holding onto a text selection after edit mode has ended, as it does when the editable is
  // blurred by a tap outside the thought or when a long press that selects a word exits edit mode via onFocus
  const editable = document.createElement('div')
  editable.setAttribute('contenteditable', 'true')
  editable.textContent = 'Cybersemics Institute'
  document.body.appendChild(editable)
  selection.setRange(editable, { start: 0, end: 'Cybersemics'.length })
  expect(selection.text()).toBe('Cybersemics')
  expect(store.getState().isKeyboardOpen).toBe(false)

  // the platform reports the keyboard hiding, e.g. the Android Down Arrow button or the Capacitor keyboardDidHide event
  store.dispatch(dismissKeyboard())

  // the text selector and its context menu should be dismissed along with the keyboard
  expect(selection.text()).toBe('')

  document.body.removeChild(editable)
})
