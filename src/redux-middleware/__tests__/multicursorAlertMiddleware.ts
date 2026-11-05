import { cursorClearedActionCreator as cursorCleared } from '../../actions/cursorCleared'
import { importTextActionCreator as importText } from '../../actions/importText'
import { removeMulticursorActionCreator as removeMulticursor } from '../../actions/removeMulticursor'
import { toggleDropdownActionCreator as toggleDropdown } from '../../actions/toggleDropdown'
import { undoActionCreator as undo } from '../../actions/undo'
import { executeCommandWithMulticursor } from '../../commands'
import archiveCommand from '../../commands/archive'
import clearThoughtCommand from '../../commands/clearThought'
import deleteCommand from '../../commands/delete'
import indentCommand from '../../commands/indent'
import newSubthoughtCommand from '../../commands/newSubthought'
import newSubthoughtTopCommand from '../../commands/newSubthoughtTop'
import newThoughtCommand from '../../commands/newThought'
import { initialize } from '../../initialize'
import contextToPath from '../../selectors/contextToPath'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import { editThoughtByContextActionCreator as editThoughtByContext } from '../../test-helpers/editThoughtByContext'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

// The Command Center is only shown on touch devices, so emulate a touch device for these tests.
vi.mock('../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../browser')>()
  return { ...actual, isTouch: true }
})

beforeEach(initStore)

it('shows the Command Center on mobile when a multicursor is active', async () => {
  await initialize({ storage: 'memory' })

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

it('hides the Command Center while a multiselection is being edited and re-opens it when the keyboard closes', async () => {
  await initialize({ storage: 'memory' })

  store.dispatch([
    importText({
      text: `
        - A
        - B
        - C`,
    }),
    setCursor(['C']),
    addMulticursor(['A']),
    addMulticursor(['B']),
    addMulticursor(['C']),
  ])

  expect(store.getState().showCommandCenter).toBe(true)

  // Clear Thought enters multi edit mode: the caret is placed on the first selected thought and the keyboard opens.
  // The Command Center must close so that the keyboard has the screen, and stay closed while editing.
  executeCommandWithMulticursor(clearThoughtCommand, { store })

  expect(store.getState().showCommandCenter).toBe(false)
  expect(Object.keys(store.getState().multicursors).length).toBe(3)

  // Closing the keyboard exits the cleared state (see onBlur in Editable). The multiselection is still active, so the
  // Command Center re-opens.
  store.dispatch(cursorCleared({ value: false }))

  expect(store.getState().showCommandCenter).toBe(true)
  expect(Object.keys(store.getState().multicursors).length).toBe(3)
})

// https://github.com/cybersemics/em/pull/4520#issuecomment-5339007687
it('does not re-open the Command Center over an edited multiselection when the multicursor count changes mid-edit', async () => {
  await initialize({ storage: 'memory' })

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
    addMulticursor(['c']),
  ])

  // Clear Thought enters multi edit mode: the keyboard opens and the Command Center closes.
  executeCommandWithMulticursor(clearThoughtCommand, { store })

  expect(store.getState().isKeyboardOpen).toBe(true)
  expect(store.getState().showCommandCenter).toBe(false)

  // The multicursor count fluctuating while the multiselection is already being edited (e.g. a stray add/remove) is
  // not the same event as starting a new multiselection, so it must not re-open the Command Center over the editing
  // session. An explicit Open Command Center gesture still re-opens it, since that command sets showCommandCenter
  // itself rather than going through this middleware (see openCommandCenter.ts).
  const pathB = contextToPath(store.getState(), ['b'])!
  store.dispatch(removeMulticursor({ path: pathB }))
  expect(store.getState().showCommandCenter).toBe(false)

  store.dispatch(addMulticursor(['b']))
  expect(store.getState().showCommandCenter).toBe(false)
})

// https://github.com/cybersemics/em/pull/4520
it('does not re-open the Command Center when a multicursor command restores the multiselection mid-edit', async () => {
  await initialize({ storage: 'memory' })

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
    addMulticursor(['c']),
  ])

  // Clear Thought enters multi edit mode: the keyboard opens and the Command Center closes.
  executeCommandWithMulticursor(clearThoughtCommand, { store })

  expect(store.getState().isKeyboardOpen).toBe(true)
  expect(store.getState().showCommandCenter).toBe(false)

  // Typing exits the cleared state while the multiselection is still being edited.
  store.dispatch(editThoughtByContext(['a'], 'ab'))

  expect(store.getState().isKeyboardOpen).toBe(true)
  expect(store.getState().showCommandCenter).toBe(false)

  // Typing a space runs indent (space-to-indent), which bails on a non-empty thought without indenting. The
  // multicursor loop still sets the cursor to each selected thought, which empties state.multicursors, and then
  // restores them one at a time — so the count passes through 0 and the first restored multicursor is
  // indistinguishable from starting a new multiselection. That must not re-open the Command Center over the
  // editing session: on iOS the focus that follows is dismissed (see onFocus in Editable), closing the keyboard.
  executeCommandWithMulticursor(indentCommand, { store, type: 'keyboard' })

  expect(store.getState().showCommandCenter).toBe(false)
  expect(Object.keys(store.getState().multicursors).length).toBe(3)
})

it('does not show the Command Center when undoing a multicursor delete while the Undo Slider is active', async () => {
  await initialize({ storage: 'memory' })

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

// https://github.com/cybersemics/em/issues/3564
it('keeps the Command Center open when New Thought replaces the multiselection with the thoughts it creates', async () => {
  await initialize({ storage: 'memory' })

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
    addMulticursor(['c']),
  ])

  expect(store.getState().showCommandCenter).toBe(true)

  // New Thought selects the new empty thoughts it creates, so the multiselection is replaced rather than ended and
  // the Command Center must stay open over it.
  executeCommandWithMulticursor(newThoughtCommand, { store })

  expect(Object.keys(store.getState().multicursors).length).toBe(3)
  expect(store.getState().showCommandCenter).toBe(true)
})

// https://github.com/cybersemics/em/issues/3564
it('keeps the Command Center open when New Subthought replaces the multiselection with the thoughts it creates', async () => {
  await initialize({ storage: 'memory' })

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
    addMulticursor(['c']),
  ])

  expect(store.getState().showCommandCenter).toBe(true)

  executeCommandWithMulticursor(newSubthoughtCommand, { store })

  expect(Object.keys(store.getState().multicursors).length).toBe(3)
  expect(store.getState().showCommandCenter).toBe(true)
})

// https://github.com/cybersemics/em/issues/3564
it('keeps the Command Center open when New Subthought (above) replaces the multiselection with the thoughts it creates', async () => {
  await initialize({ storage: 'memory' })

  store.dispatch([
    importText({
      text: `
        - a
          - x
        - b
          - y
        - c
          - z`,
    }),
    setCursor(['a']),
    addMulticursor(['a']),
    addMulticursor(['b']),
    addMulticursor(['c']),
  ])

  expect(store.getState().showCommandCenter).toBe(true)

  executeCommandWithMulticursor(newSubthoughtTopCommand, { store })

  expect(Object.keys(store.getState().multicursors).length).toBe(3)
  expect(store.getState().showCommandCenter).toBe(true)
})

// https://github.com/cybersemics/em/issues/6143
describe('removing thoughts from the Command Center', () => {
  it('keeps the Command Center open when Delete leaves a sibling for the cursor', async () => {
    await initialize({ storage: 'memory' })

    store.dispatch([
      importText({
        text: `
          - a
            - b
            - c`,
      }),
      setCursor(['a', 'b']),
      // open the Command Center by activating a multicursor on the cursor thought (swipe up)
      addMulticursor(['a', 'b']),
    ])

    executeCommandWithMulticursor(deleteCommand, { store, type: 'commandCenter' })

    expectPathToEqual(store.getState(), store.getState().cursor, ['a', 'c'])
    expect(store.getState().showCommandCenter).toBe(true)
  })

  it('closes the Command Center when Delete removes the last remaining sibling', async () => {
    await initialize({ storage: 'memory' })

    store.dispatch([
      importText({
        text: `
          - a
            - b
            - c`,
      }),
      setCursor(['a', 'b']),
      addMulticursor(['a', 'b']),
    ])

    executeCommandWithMulticursor(deleteCommand, { store, type: 'commandCenter' })
    executeCommandWithMulticursor(deleteCommand, { store, type: 'commandCenter' })

    expectPathToEqual(store.getState(), store.getState().cursor, ['a'])
    expect(store.getState().showCommandCenter).toBe(false)
  })

  it('closes the Command Center when Archive removes the last remaining sibling', async () => {
    await initialize({ storage: 'memory' })

    store.dispatch([
      importText({
        text: `
          - a
            - b`,
      }),
      setCursor(['a', 'b']),
      addMulticursor(['a', 'b']),
    ])

    executeCommandWithMulticursor(archiveCommand, { store, type: 'commandCenter' })

    expectPathToEqual(store.getState(), store.getState().cursor, ['a'])
    expect(store.getState().showCommandCenter).toBe(false)
  })

  it('closes the Command Center when Delete removes a multiselection of all siblings', async () => {
    await initialize({ storage: 'memory' })

    store.dispatch([
      importText({
        text: `
          - a
            - b
            - c`,
      }),
      setCursor(['a', 'b']),
      addMulticursor(['a', 'b']),
      addMulticursor(['a', 'c']),
    ])

    executeCommandWithMulticursor(deleteCommand, { store, type: 'commandCenter' })

    expectPathToEqual(store.getState(), store.getState().cursor, ['a'])
    expect(store.getState().showCommandCenter).toBe(false)
  })

  it('keeps the Command Center open when Archive removes a multiselection that leaves a sibling', async () => {
    await initialize({ storage: 'memory' })

    store.dispatch([
      importText({
        text: `
          - a
            - b
            - c
            - d`,
      }),
      setCursor(['a', 'b']),
      addMulticursor(['a', 'b']),
      addMulticursor(['a', 'c']),
    ])

    executeCommandWithMulticursor(archiveCommand, { store, type: 'commandCenter' })

    expectPathToEqual(store.getState(), store.getState().cursor, ['a', 'd'])
    expect(store.getState().showCommandCenter).toBe(true)
  })

  it('keeps the Command Center open when a multiselection across parents leaves a sibling under one of them', async () => {
    await initialize({ storage: 'memory' })

    store.dispatch([
      importText({
        text: `
          - a
            - b
          - x
            - y
            - z`,
      }),
      setCursor(['a', 'b']),
      addMulticursor(['a', 'b']),
      addMulticursor(['x', 'y']),
    ])

    executeCommandWithMulticursor(deleteCommand, { store, type: 'commandCenter' })

    expect(store.getState().showCommandCenter).toBe(true)
    expect(Object.keys(store.getState().multicursors).length).toBe(1)
  })

  it('closes the Command Center when a multiselection across parents leaves no siblings under any of them', async () => {
    await initialize({ storage: 'memory' })

    store.dispatch([
      importText({
        text: `
          - a
            - b
          - x
            - y`,
      }),
      setCursor(['a', 'b']),
      addMulticursor(['a', 'b']),
      addMulticursor(['x', 'y']),
    ])

    executeCommandWithMulticursor(deleteCommand, { store, type: 'commandCenter' })

    expect(store.getState().showCommandCenter).toBe(false)
  })
})
