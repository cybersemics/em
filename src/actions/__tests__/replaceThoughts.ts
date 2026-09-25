import State from '../../@types/State'
import { thoughtspaceRuntime } from '../../data-providers/thoughtspace'
import getLexeme from '../../selectors/getLexeme'
import store from '../../stores/app'
import contextToThought from '../../test-helpers/contextToThought'
import deleteThoughtAtFirstMatch from '../../test-helpers/deleteThoughtAtFirstMatch'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import initStore from '../../test-helpers/initStore'
import moveThoughtAtFirstMatch from '../../test-helpers/moveThoughtAtFirstMatch'
import runDocumentCommand from '../../test-helpers/runDocumentCommand'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'
import { importTextActionCreator as importText } from '../importText'
import replaceThoughts, { replaceThoughtsActionCreator } from '../replaceThoughts'

afterEach(waitForThoughtspaceIdle)

beforeEach(async () => {
  await initStore()
  store.dispatch([importText({ text: '- a\n  - b\n    - c\n- x' }), setCursor(['a', 'b', 'c'])])
})

it('replaces the entire document and repairs a deleted cursor to its surviving parent', () => {
  const previous = store.getState()
  const deletedId = contextToThought(previous, ['a', 'b', 'c'])!.id
  const incoming = runDocumentCommand(deleteThoughtAtFirstMatch(['a', 'b', 'c']), previous).thoughts

  const next = replaceThoughts(previous, { thoughts: incoming, repairCursor: true })

  expect(next.thoughts).toBe(incoming)
  expect(next.thoughts.thoughtIndex[deletedId]).toBeUndefined()
  expect(getLexeme(next, 'c')).toBeUndefined()
  expectPathToEqual(next, next.cursor, ['a', 'b'])
  expect(next.isLoading).toBe(false)
})

it('clears the cursor when its entire ancestry was deleted', () => {
  const previous = store.getState()
  const incoming = runDocumentCommand(deleteThoughtAtFirstMatch(['a']), previous).thoughts

  const next = replaceThoughts(previous, { thoughts: incoming, repairCursor: true })

  expect(next.cursor).toBeNull()
  expect(contextToThought(next, ['x'])).toBeTruthy()
})

it('follows a surviving cursor when an ancestor moves', () => {
  const previous = store.getState()
  const incoming = runDocumentCommand(
    moveThoughtAtFirstMatch({ from: ['a', 'b'], to: ['x', 'b'], after: null }),
    previous,
  ).thoughts

  const next = replaceThoughts(previous, { thoughts: incoming, repairCursor: true })

  expectPathToEqual(next, next.cursor, ['x', 'b', 'c'])
  expect(contextToThought(next, ['a', 'b'])).toBeUndefined()
})

it('publishes a canonical snapshot atomically without adding history or authored writes', async () => {
  const previous = store.getState()
  const incoming = runDocumentCommand(
    moveThoughtAtFirstMatch({ from: ['a', 'b'], to: ['x', 'b'], after: null }),
    previous,
  ).thoughts
  // Incoming memory changes already exist outside Redux before its publication callback dispatches the snapshot.
  await waitForThoughtspaceIdle()

  const observed: State[] = []
  const unsubscribe = store.subscribe(() => observed.push(store.getState()))
  try {
    store.dispatch(replaceThoughtsActionCreator({ thoughts: incoming, repairCursor: true }))
  } finally {
    unsubscribe()
  }

  expect(observed).toHaveLength(1)
  const next = observed[0]
  expect(next.thoughts).toBe(incoming)
  expectPathToEqual(next, next.cursor, ['x', 'b', 'c'])
  expect(contextToThought(next, ['a', 'b'])).toBeUndefined()
  expect(contextToThought(next, ['x', 'b', 'c'])).toBeTruthy()
  expect(next.undoPatches).toBe(previous.undoPatches)
  expect(next.redoPatches).toBe(previous.redoPatches)
  expect(next.jumpHistory).toBe(previous.jumpHistory)
  expect(thoughtspaceRuntime.project()).toBe(incoming)
})
