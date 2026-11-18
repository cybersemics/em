import { importTextActionCreator as importText } from '../../actions/importText'
import { setCursorActionCreator as setCursorPath } from '../../actions/setCursor'
import { undoActionCreator as undo } from '../../actions/undo'
import { updateThoughtsActionCreator as updateThoughts } from '../../actions/updateThoughts'
import { initialize } from '../../initialize'
import contextToPath from '../../selectors/contextToPath'
import getLexeme from '../../selectors/getLexeme'
import store from '../../stores/app'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import { toggleMulticursorAtFirstMatchActionCreator as toggleMulticursor } from '../../test-helpers/toggleMulticursorAtFirstMatch'
import hashThought from '../../util/hashThought'
import head from '../../util/head'

// The cursor is only parked at the selected thoughts' common ancestor on touch devices (see multiselectCursorMiddleware).
vi.mock('../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../browser')>()
  return { ...actual, isTouch: true }
})

beforeEach(initStore)

it('ending a multiselect after reselecting a different anchor does not throw (Error applying patch)', async () => {
  await initialize({ storage: 'memory' })

  store.dispatch([
    importText({
      text: `
        - x
          - a
          - b
            - =note
              - note
          - c`,
    }),
    setCursor(['x', 'a']),
    editThought(['x', 'a'], 'aa'),
  ])

  // long press c, then tap aa to add it to the multiselect
  store.dispatch([toggleMulticursor(['x', 'c']), toggleMulticursor(['x', 'aa'])])

  // tap the note of b, which ends the multiselect
  store.dispatch((dispatch, getState) =>
    dispatch(setCursorPath({ path: contextToPath(getState(), ['x', 'b'])!, noteFocus: true })),
  )

  // long press aa, then tap c to add it to the multiselect
  store.dispatch([toggleMulticursor(['x', 'aa']), toggleMulticursor(['x', 'c'])])

  // tap c and then aa to deselect them, which ends the multiselect
  expect(() => store.dispatch([toggleMulticursor(['x', 'c']), toggleMulticursor(['x', 'aa'])])).not.toThrow()

  expectPathToEqual(store.getState(), store.getState().cursor, ['x', 'aa'])
})

it('undo restores a Lexeme that the readback reordered during a typing run', () => {
  store.dispatch([
    importText({
      text: `
        - abc
        - x
          - ab`,
    }),
    editThought(['abc'], 'ab'),
  ])

  // The readback publishes a Lexeme's contexts in the provider's order, which can differ from the order in Redux
  const lexeme = getLexeme(store.getState(), 'ab')!
  store.dispatch(
    updateThoughts({
      thoughtIndexUpdates: {},
      lexemeIndexUpdates: { [hashThought('ab')]: { ...lexeme, contexts: [...lexeme.contexts].reverse() } },
      local: false,
      remote: false,
    }),
  )

  // merged into the previous edit's undo step, which replays that step's patch on the reordered Lexeme
  store.dispatch(editThought(['ab'], 'a'))
  store.dispatch(undo())

  expect(getLexeme(store.getState(), 'ab')?.contexts).toEqual([head(contextToPath(store.getState(), ['x', 'ab'])!)])
})

it('undo does not throw when the readback deleted a Lexeme that the undo restores', () => {
  store.dispatch([
    importText({
      text: `
        - a
        - x
          - a`,
    }),
    editThought(['a'], 'b'),
  ])

  // Another device deletes x/a, so the readback deletes the Lexeme of a
  store.dispatch(
    updateThoughts({
      thoughtIndexUpdates: { [head(contextToPath(store.getState(), ['x', 'a'])!)]: null },
      lexemeIndexUpdates: { [hashThought('a')]: null },
      local: false,
      remote: false,
    }),
  )

  expect(() => store.dispatch(undo())).not.toThrow()
})
