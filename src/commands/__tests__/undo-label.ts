import { editThoughtActionCreator as editThoughtRaw } from '../../actions/editThought'
import { importTextActionCreator as importText } from '../../actions/importText'
import { redoActionCreator as redo } from '../../actions/redo'
import { setDescendantActionCreator as setDescendant } from '../../actions/setDescendant'
import { setSortPreferenceActionCreator as setSortPreference } from '../../actions/setSortPreference'
import { undoActionCreator as undo } from '../../actions/undo'
import { executeCommand } from '../../commands'
import { HOME_PATH } from '../../constants'
import contextToPath from '../../selectors/contextToPath'
import store from '../../stores/app'
import {
  endBatchEditing,
  getBatchEditingUndoLabel,
  mergeBatchEditing,
  startBatchEditing,
} from '../../stores/batchEditing'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import withUndoLabel from '../../util/withUndoLabel'
import pinCommand from '../pin'
import toggleDoneCommand from '../toggleDone'

beforeEach(initStore)

/** Dispatches a formatting edit the same way Editable emits editThought after document.execCommand mutates the DOM. */
const dispatchBatchFormattingEdit = (undoLabel: string, newValue: string) => {
  const oldValue = 'hello'
  const path = contextToPath(store.getState(), [oldValue])
  if (!path) throw new Error('Test thought not found')

  startBatchEditing(undoLabel)
  try {
    store.dispatch(
      editThoughtRaw({
        path,
        oldValue,
        newValue,
        force: true,
        mergePrev: mergeBatchEditing(),
        undoLabel: getBatchEditingUndoLabel(),
      }),
    )
  } finally {
    endBatchEditing()
    vi.runOnlyPendingTimers()
  }
}

it('uses command undo labels in undo and redo alerts', () => {
  store.dispatch([
    importText({
      text: `
        - a
          - b
            - c
    `,
    }),
    setCursor(['a', 'b']),
  ])

  executeCommand(pinCommand, { store })

  store.dispatch(undo())
  expect(store.getState().alert?.value).toBe('Undo: Pin Thought')

  store.dispatch(redo())
  expect(store.getState().alert?.value).toBe('Redo: Pin Thought')
})

it('uses inverse command labels when toggling active commands off', () => {
  store.dispatch([
    importText({
      text: `
        - a
          - =done
    `,
    }),
    setCursor(['a']),
  ])

  executeCommand(toggleDoneCommand, { store })

  store.dispatch(undo())
  expect(store.getState().alert?.value).toBe('Undo: Unmark as done')
})

it('uses explicit undo labels for direct undoable dispatches', () => {
  store.dispatch([
    importText({
      text: `
        - a
          - b
            - c
    `,
    }),
    setCursor(['a', 'b']),
  ])

  store.dispatch(
    withUndoLabel(setDescendant({ path: store.getState().cursor!, values: ['=pin', 'false'] }), 'Pin Thought'),
  )

  store.dispatch(undo())
  expect(store.getState().alert?.value).toBe('Undo: Pin Thought')
})

it('uses sort preference labels instead of internal action names', () => {
  store.dispatch([
    importText({
      text: `
        - b
        - a
    `,
    }),
    setSortPreference({
      simplePath: HOME_PATH,
      sortPreference: {
        type: 'Alphabetical',
        direction: 'Asc',
      },
    }),
  ])

  store.dispatch(undo())
  expect(store.getState().alert?.value).toBe('Undo: Sort by Alphabetical ↑')
})

it.each([
  ['Bold', '<b>hello</b>'],
  ['Text Color', '<font color="#ff0000">hello</font>'],
  ['Background Color', '<span style="background-color: rgb(255, 165, 0);">hello</span>'],
])('uses batch edit labels for %s edits emitted by Editable', (undoLabel, newValue) => {
  store.dispatch(
    importText({
      text: `
        - hello
    `,
    }),
  )

  dispatchBatchFormattingEdit(undoLabel, newValue)

  store.dispatch(undo())
  expect(store.getState().alert?.value).toBe(`Undo: ${undoLabel}`)
})
