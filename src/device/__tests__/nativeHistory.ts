import { importTextActionCreator as importText } from '../../actions/importText'
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

afterEach(() => nativeHistory.destroy())

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
it.skip('reports em undo and redo availability to iOS', () => {
  nativeHistory.init()

  // a newly created thought can be undone, but there is nothing to redo
  store.dispatch([importText({ text: '- Make' }), setCursor(['Make'])])
  expect(mockHistoryAvailability).toEqual({ canUndo: true, canRedo: false })

  // undoing it makes redo available
  store.dispatch(undo())
  expect(mockHistoryAvailability).toEqual({ canUndo: false, canRedo: true })
})
