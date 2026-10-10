import State from '../../@types/State'
import db from '../../data-providers/thoughtspace'
import getLexeme from '../../selectors/getLexeme'
import getThoughtById from '../../selectors/getThoughtById'
import simplifyPath from '../../selectors/simplifyPath'
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
import { toggleContextViewActionCreator as toggleContextView } from '../toggleContextView'
import { updateThoughtsActionCreator as updateThoughts } from '../updateThoughts'

afterEach(waitForThoughtspaceIdle)

beforeEach(async () => {
  await initStore()
  store.dispatch([importText({ text: '- a\n  - b\n    - c\n- x' }), setCursor(['a', 'b', 'c'])])
})

it('replaces the entire document and repairs a deleted cursor to its surviving parent', () => {
  const previous = store.getState()
  const deletedId = contextToThought(previous, ['a', 'b', 'c'])!.id
  const incoming = runDocumentCommand(deleteThoughtAtFirstMatch(['a', 'b', 'c']), previous).thoughts

  const next = replaceThoughts(previous, {
    thoughts: incoming,
    previousCursorPath: simplifyPath(previous, previous.cursor!),
    repairCursor: true,
  })

  expect(next.thoughts).toBe(incoming)
  expect(next.thoughts.getThought(deletedId)).toBeUndefined()
  expect(getLexeme(next, 'c')).toBeUndefined()
  expectPathToEqual(next, next.cursor, ['a', 'b'])
  expect(next.isLoading).toBe(false)
})

it('clears the cursor when its entire ancestry was deleted', () => {
  const previous = store.getState()
  const incoming = runDocumentCommand(deleteThoughtAtFirstMatch(['a']), previous).thoughts

  const next = replaceThoughts(previous, {
    thoughts: incoming,
    previousCursorPath: simplifyPath(previous, previous.cursor!),
    repairCursor: true,
  })

  expect(next.cursor).toBeNull()
  expect(contextToThought(next, ['x'])).toBeTruthy()
})

it('preserves surviving thought UI across canonical replacement and prunes deleted thought UI', () => {
  const a = contextToThought(store.getState(), ['a'])!
  const c = contextToThought(store.getState(), ['a', 'b', 'c'])!
  store.dispatch(
    updateThoughts({
      thoughtUiUpdates: {
        [a.id]: { generating: true, generatingPlaceholder: 'preview', splitSource: c.id },
        [c.id]: { generating: true, generatingPlaceholder: 'deleted preview' },
      },
    }),
  )
  const previous = store.getState()
  const rendered = getThoughtById(previous, a.id)!
  const incoming = db.transact(transaction =>
    transaction.update({ thoughtIndexUpdates: { [a.id]: { ...a, value: 'incoming a' }, [c.id]: null } }),
  ).value

  store.dispatch(replaceThoughtsActionCreator({ thoughts: incoming, repairCursor: true }))

  const next = store.getState()
  expect(next.thoughts).toBe(incoming)
  expect(next.thoughtUi[a.id]).toBe(previous.thoughtUi[a.id])
  expect(getThoughtById(next, a.id)).toMatchObject({
    value: 'incoming a',
    generating: true,
    generatingPlaceholder: 'preview',
    splitSource: c.id,
  })
  expect(next.thoughtUi[c.id]).toBeUndefined()
  expect(getThoughtById(next, c.id)).toBeUndefined()
  expect(previous.thoughtUi[c.id]).toEqual({ generating: true, generatingPlaceholder: 'deleted preview' })
  expect(getThoughtById(previous, a.id)?.value).toBe('incoming a')
  expect(rendered).toMatchObject({ value: 'a', generatingPlaceholder: 'preview' })
})

it('publishes a provider event atomically without adding history or authored writes', () => {
  const previous = store.getState()
  const observed: State[] = []
  const unsubscribe = store.subscribe(() => observed.push(store.getState()))
  try {
    db.transact(transaction =>
      moveThoughtAtFirstMatch({ from: ['a', 'b'], to: ['x', 'b'], after: null })(previous, transaction),
    )
  } finally {
    unsubscribe()
  }

  expect(observed).toHaveLength(1)
  const next = observed[0]
  expect(next.thoughts).toBe(db.project())
  expectPathToEqual(next, next.cursor, ['x', 'b', 'c'])
  expect(contextToThought(next, ['a', 'b'])).toBeUndefined()
  expect(contextToThought(next, ['x', 'b', 'c'])).toBeTruthy()
  expect(next.undoPatches).toBe(previous.undoPatches)
  expect(next.redoPatches).toBe(previous.redoPatches)
  expect(next.jumpHistory).toBe(previous.jumpHistory)
})

it('retains a context-view cursor until its resolved thought moves', () => {
  store.dispatch([
    importText({ text: '- z\n  - b\n- y', preventSetCursor: true }),
    setCursor(['a', 'b']),
    toggleContextView(),
    setCursor(['a', 'b', 'z']),
  ])
  const cursor = store.getState().cursor
  const c = contextToThought(store.getState(), ['a', 'b', 'c'])!

  db.transact(transaction => transaction.update({ thoughtIndexUpdates: { [c.id]: { ...c, value: 'changed' } } }))
  expect(store.getState().cursor).toEqual(cursor)

  db.transact(transaction =>
    moveThoughtAtFirstMatch({ from: ['z', 'b'], to: ['y', 'b'], after: null })(store.getState(), transaction),
  )

  expectPathToEqual(store.getState(), store.getState().cursor, ['y', 'b'])
})

it('repairs the latest navigation when a UI publication observer changes the document', () => {
  const x = contextToThought(store.getState(), ['x'])!
  const unsubscribe = store.uiStore.subscribe(() => {
    unsubscribe()
    db.transact(transaction => transaction.update({ thoughtIndexUpdates: { [x.id]: null } }))
  })
  try {
    store.dispatch(setCursor(['x']))
  } finally {
    unsubscribe()
  }

  expect(store.getState().cursor).toBeNull()
})
