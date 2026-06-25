import { importTextActionCreator as importText } from '../../actions/importText'
import { toggleDropdownActionCreator as toggleDropdown } from '../../actions/toggleDropdown'
import { undoActionCreator as undo } from '../../actions/undo'
import { executeCommandWithMulticursor } from '../../commands'
import boldCommand from '../../commands/bold'
import deleteCommand from '../../commands/delete'
import { AlertType } from '../../constants'
import { initialize } from '../../initialize'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

// The Command Center is only shown on touch devices, so emulate a touch device for these tests.
vi.mock('../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../browser')>()
  return { ...actual, isTouch: true }
})

beforeEach(initStore)

it('shows the Command Center on mobile when a multicursor is active', async () => {
  await initialize()

  store.dispatch([
    importText({
      text: `
        - A
        - B
        - C`,
    }),
    setCursor(['C']),
    // activating a multicursor on the cursor thought is how the Command Center is opened (swipe up)
    addMulticursor(['C']),
  ])

  expect(store.getState().showCommandCenter).toBe(true)
})

it('keeps the Command Center open while a multicursor formatting command executes', async () => {
  await initialize()

  store.dispatch([
    importText({
      text: `
        - A
        - B
        - C`,
    }),
    setCursor(['C']),
    // open the Command Center by activating a multicursor on the cursor thought (swipe up)
    addMulticursor(['C']),
  ])
  expect(store.getState().showCommandCenter).toBe(true)

  // Track whether the Command Center is ever closed mid-command.
  // executeCommandWithMulticursor transiently clears and restores the multicursors, which previously flickered
  // showCommandCenter true → false → true and re-animated the sheet on iOS.
  let closedDuringExecution = false
  const unsubscribe = store.subscribe(() => {
    if (!store.getState().showCommandCenter) closedDuringExecution = true
  })

  // apply a formatting command (Bold) across the multicursor
  executeCommandWithMulticursor(boldCommand, { store })

  unsubscribe()

  expect(closedDuringExecution).toBe(false)
  expect(store.getState().showCommandCenter).toBe(true)
})

it('does not show the multicursor alert on mobile while a multicursor command executes', async () => {
  await initialize()

  store.dispatch([
    importText({
      text: `
        - A
        - B
        - C`,
    }),
    setCursor(['C']),
    // open the Command Center by activating a multicursor on the cursor thought (swipe up)
    addMulticursor(['C']),
  ])
  expect(store.getState().showCommandCenter).toBe(true)

  // apply a formatting command (Bold) across the multicursor
  executeCommandWithMulticursor(boldCommand, { store })

  // Flush the throttled alert dispatch in the middleware.
  vi.advanceTimersByTime(1000)

  // On mobile the Command Center—not the alert—reflects the multicursor selection. The "n thoughts selected" alert
  // must never be shown on touch, otherwise its auto-dismiss (Alert.tsx clearDelay) clears the multicursors and
  // closes the Command Center a few seconds after a formatting command (#3995 Issue B).
  expect(store.getState().alert?.alertType).not.toBe(AlertType.MulticursorActive)
  expect(store.getState().showCommandCenter).toBe(true)
})

it('does not show the Command Center when undoing a multicursor delete while the Undo Slider is active', async () => {
  await initialize()

  store.dispatch([
    importText({
      text: `
        - A
        - B
        - C`,
    }),
    setCursor(['C']),
    // open the Command Center by activating a multicursor on the cursor thought (swipe up)
    addMulticursor(['C']),
  ])

  expect(store.getState().showCommandCenter).toBe(true)

  // delete the thought from the Command Center
  executeCommandWithMulticursor(deleteCommand, { store })

  // deleting clears the multicursor, which closes the Command Center
  expect(store.getState().showCommandCenter).toBe(false)

  // open the Undo Slider
  store.dispatch(toggleDropdown({ dropDownType: 'undoSlider' }))
  expect(store.getState().showUndoSlider).toBe(true)

  // drag the slider to the left to undo the deletion
  store.dispatch(undo())

  // the Undo Slider should not be auto dismissed, and the Command Center should not be re-shown
  // even though undo restores the multicursor
  expect(store.getState().showUndoSlider).toBe(true)
  expect(store.getState().showCommandCenter).toBe(false)
})
