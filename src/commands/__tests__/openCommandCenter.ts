import { importTextActionCreator as importText } from '../../actions/importText'
import { setIsMulticursorExecutingActionCreator as setIsMulticursorExecuting } from '../../actions/setIsMulticursorExecuting'
import { executeCommand, executeCommandWithMulticursor } from '../../commands'
import clearThoughtCommand from '../../commands/clearThought'
import closeCommandCenter from '../../commands/closeCommandCenter'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import openCommandCenter from '../openCommandCenter'

// The Command Center is only shown on touch devices, so emulate a touch device for these tests.
vi.mock('../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../browser')>()
  return { ...actual, isTouch: true }
})

beforeEach(initStore)

describe('openCommandCenter', () => {
  it('opens the Command Center on the cursor thought', () => {
    store.dispatch([
      importText({
        text: `
          - a
          - b`,
      }),
      setCursor(['a']),
    ])

    executeCommand(openCommandCenter, { store })

    expect(store.getState().showCommandCenter).toBe(true)
    expect(Object.keys(store.getState().multicursors).length).toBe(1)
  })

  it('re-opens the Command Center when it was hidden while the multiselection was edited', () => {
    store.dispatch([
      importText({
        text: `
          - a
          - b
          - c`,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
      addMulticursor(['b']),
    ])

    // Clear Thought enters multi edit mode, which hides the Command Center but keeps the multiselection.
    executeCommandWithMulticursor(clearThoughtCommand, { store })

    expect(store.getState().showCommandCenter).toBe(false)
    expect(Object.keys(store.getState().multicursors).length).toBe(2)

    // The user can see that the Command Center is closed, so swiping up must bring it back rather than treat the
    // surviving multiselection as proof that it is already open.
    executeCommand(openCommandCenter, { store })

    expect(store.getState().showCommandCenter).toBe(true)
    expect(Object.keys(store.getState().multicursors).length).toBe(2)
  })

  it('re-opens the Command Center after it was closed while a multicursor command was executing', () => {
    store.dispatch([
      importText({
        text: `
          - a
          - b`,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
    ])

    // An asynchronous multicursor command (e.g. Generate Thought) brackets its edits with setIsMulticursorExecuting,
    // during which multicursorAlertMiddleware ignores multiselection changes.
    store.dispatch(setIsMulticursorExecuting({ value: true, undoLabel: 'generateThought' }))

    executeCommand(closeCommandCenter, { store })

    expect(store.getState().showCommandCenter).toBe(false)
    expect(Object.keys(store.getState().multicursors).length).toBe(0)

    // Swiping back up must re-open it rather than wait for the command to finish.
    executeCommand(openCommandCenter, { store })

    expect(store.getState().showCommandCenter).toBe(true)
    expect(Object.keys(store.getState().multicursors).length).toBe(1)
  })
})
