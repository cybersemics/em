import { importTextActionCreator as importText } from '../../actions/importText'
import { setIsMulticursorExecutingActionCreator as setIsMulticursorExecuting } from '../../actions/setIsMulticursorExecuting'
import { executeCommand } from '../../commands'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import closeCommandCenter from '../closeCommandCenter'

// The Command Center is only shown on touch devices, so emulate a touch device for these tests.
vi.mock('../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../browser')>()
  return { ...actual, isTouch: true }
})

beforeEach(initStore)

describe('closeCommandCenter', () => {
  it('closes the Command Center and clears the multiselection', () => {
    store.dispatch([
      importText({
        text: `
          - a
          - b`,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
    ])

    expect(store.getState().showCommandCenter).toBe(true)

    executeCommand(closeCommandCenter, { store })

    expect(store.getState().showCommandCenter).toBe(false)
    expect(Object.keys(store.getState().multicursors).length).toBe(0)
  })

  it('closes the Command Center while a multicursor command is executing', () => {
    store.dispatch([
      importText({
        text: `
          - a
          - b`,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
    ])

    expect(store.getState().showCommandCenter).toBe(true)

    // An asynchronous multicursor command (e.g. Generate Thought) brackets its edits with setIsMulticursorExecuting,
    // during which multicursorAlertMiddleware ignores multiselection changes. Clearing the multiselection alone would
    // leave the Command Center on screen with nothing left for a second swipe to clear.
    store.dispatch(setIsMulticursorExecuting({ value: true, undoLabel: 'generateThought' }))

    executeCommand(closeCommandCenter, { store })

    expect(store.getState().showCommandCenter).toBe(false)
    expect(Object.keys(store.getState().multicursors).length).toBe(0)
  })
})
