import { importTextActionCreator as importText } from '../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { undoActionCreator as undo } from '../../actions/undo'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import nativeHistory from '../nativeHistory'

/** Captures the native history listener registered by the module so the test can invoke it. */
const mockNativeHistoryListeners: Record<string, (event: { type: 'undo' | 'redo' }) => void> = {}

/** Captures the undo/redo availability last reported to iOS. */
let mockHistoryAvailability: { canUndo: boolean; canRedo: boolean } | null = null

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => 'ios',
    isNativePlatform: () => true,
    isPluginAvailable: () => true,
  },
}))

vi.mock('webview-background', () => ({
  WebviewBackground: {
    addListener: (event: string, callback: (event: { type: 'undo' | 'redo' }) => void) => {
      mockNativeHistoryListeners[event] = callback
      return Promise.resolve({ remove: () => Promise.resolve() })
    },
    setHistoryAvailability: (availability: { canUndo: boolean; canRedo: boolean }) => {
      mockHistoryAvailability = availability
      return Promise.resolve()
    },
  },
}))

beforeEach(() => {
  mockHistoryAvailability = null
})

beforeEach(initStore)

it('undoes and redoes an edit when iOS emits a native history gesture', () => {
  store.dispatch([importText({ text: '- Makre' }), setCursor(['Makre'])])

  // simulate iOS autocorrect replacing the word
  store.dispatch(editThought(['Makre'], 'Make'))
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Make`)

  nativeHistory.init()
  expect(mockNativeHistoryListeners.nativeHistory).toBeDefined()

  // a native undo gesture reverts the autocorrect, even though WebKit's own undo stack is empty
  mockNativeHistoryListeners.nativeHistory({ type: 'undo' })
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Makre`)

  // a native redo gesture restores it, without duplicating the text
  mockNativeHistoryListeners.nativeHistory({ type: 'redo' })
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Make`)
})

// https://github.com/cybersemics/em/pull/4692#pullrequestreview-4907108666
it('reports em undo and redo availability to iOS', () => {
  nativeHistory.init()

  // a newly created thought can be undone, but there is nothing to redo
  store.dispatch(newThought({ value: 'Make' }))
  expect(mockHistoryAvailability).toEqual({ canUndo: true, canRedo: false })

  // undoing it makes redo available
  store.dispatch(undo())
  expect(mockHistoryAvailability).toEqual({ canUndo: false, canRedo: true })
})

// https://github.com/cybersemics/em/issues/6214
it('leaves the native undo of a text field to the text field', () => {
  store.dispatch([importText({ text: '- a' }), setCursor(['a'])])
  store.dispatch(editThought(['a'], 'ab'))
  const input = document.createElement('input')
  document.body.appendChild(input)
  let consumed: boolean | undefined
  input.addEventListener('beforeinput', e => {
    consumed = nativeHistory.beforeInput(e as InputEvent)
  })

  const event = new InputEvent('beforeinput', { inputType: 'historyUndo', cancelable: true })
  input.dispatchEvent(event)

  expect(consumed).toBe(false)
  expect(event.defaultPrevented).toBe(false)
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - ab`)

  input.remove()
})

// https://github.com/cybersemics/em/issues/6214
it('does not undo the thoughtspace when the native undo of a text field reaches past it to a thought', () => {
  store.dispatch([importText({ text: '- a' }), setCursor(['a'])])
  store.dispatch(editThought(['a'], 'ab'))
  const input = document.createElement('input')
  const editable = document.createElement('div')
  editable.contentEditable = 'true'
  document.body.append(input, editable)
  let consumed: boolean | undefined
  editable.addEventListener('beforeinput', e => {
    consumed = nativeHistory.beforeInput(e as InputEvent)
  })

  // The webview keeps one undo history for the page, so with nothing of its own left to undo, the undo of the text
  // field that has the focus undoes the typing of a thought.
  input.focus()
  const event = new InputEvent('beforeinput', { inputType: 'historyUndo', cancelable: true })
  editable.dispatchEvent(event)

  expect(consumed).toBe(true)
  expect(event.defaultPrevented).toBe(true)
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - ab`)

  input.remove()
  editable.remove()
})
