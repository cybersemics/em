import { importTextActionCreator as importText } from '../../../../actions/importText'
import { keyboardOpenActionCreator as keyboardOpen } from '../../../../actions/keyboardOpen'
import store from '../../../../stores/app'
import virtualKeyboardStore from '../../../../stores/virtualKeyboardStore'
import initStore from '../../../../test-helpers/initStore'
import selectRange from '../../../../test-helpers/selectRange'
import { setCursorFirstMatchActionCreator as setCursor } from '../../../../test-helpers/setCursorFirstMatch'
import * as selection from '../../../selection'
import iOSSafariHandler from '../iOSSafariHandler'

vi.mock('../../../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../../browser')>()
  return { ...actual, isTouch: true, isSafari: () => true }
})

beforeEach(initStore)
afterEach(() => iOSSafariHandler.destroy())

// Since iOS 27, Safari keeps a selected range alive across the blur that closes the keyboard, so the edit menu
// stayed on screen after the keyboard was gone.
it('clears a selected range when the keyboard closes', async () => {
  store.dispatch([
    importText({ text: '- Cybersemics Institute' }),
    setCursor(['Cybersemics Institute']),
    keyboardOpen({ value: true }),
  ])

  const editable = document.createElement('div')
  editable.setAttribute('contenteditable', 'true')
  editable.textContent = 'Cybersemics Institute'
  document.body.appendChild(editable)
  editable.focus()

  iOSSafariHandler.init()

  expect(selectRange(editable, 0, 'Cybersemics'.length)).toBe('Cybersemics')
  document.dispatchEvent(new Event('selectionchange'))
  await vi.runAllTimersAsync()
  expect(virtualKeyboardStore.getState().open).toBe(true)

  // the keyboard is dismissed natively, which blurs the editable and exits edit mode but leaves the range behind
  editable.blur()
  store.dispatch(keyboardOpen({ value: false }))
  expect(selection.isCollapsed()).toBe(false)

  window.dispatchEvent(new Event('resize'))
  await vi.runAllTimersAsync()

  // the range is gone, so the edit menu has nothing left to display
  expect(selection.isActive()).toBe(false)

  document.body.removeChild(editable)
})
