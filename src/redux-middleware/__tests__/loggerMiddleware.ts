import { UnknownAction, applyMiddleware, createStore } from 'redux'
import { vi } from 'vitest'
import State from '../../@types/State'
import importTextReducer, { importTextActionCreator as importText } from '../../actions/importText'
import { undoActionCreator as undo } from '../../actions/undo'
import { updateThoughtsActionCreator as updateThoughts } from '../../actions/updateThoughts'
import store from '../../stores/app'
import contextToThought from '../../test-helpers/contextToThought'
import { editThoughtByContextActionCreator as editThoughtByContext } from '../../test-helpers/editThoughtByContext'
import initStore from '../../test-helpers/initStore'
import { moveThoughtAtFirstMatchActionCreator as moveThoughtAtFirstMatch } from '../../test-helpers/moveThoughtAtFirstMatch'
import runDocumentCommand from '../../test-helpers/runDocumentCommand'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'
import debugLog from '../../util/debugLog'
import initialState from '../../util/initialState'
import loggerMiddleware from '../loggerMiddleware'

afterEach(waitForThoughtspaceIdle)

/** A pass-through next handler for the middleware. */
const next = (action: unknown) => action

// a minimal fixed state for unit invocations; the same reference is returned before and after the action, so the thought diff is skipped
const stubState = {
  thoughts: { thoughtIndex: {}, lexemeIndex: {} },
  undoPatches: [],
  redoPatches: [],
} as unknown as State

/** Invokes the logger middleware for a single action with a stub store and pass-through next. */
const invoke = (action: unknown) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loggerMiddleware({ getState: () => stubState, dispatch: next } as any)(next)(action as any)
}

afterEach(() => {
  vi.restoreAllMocks()
})

it('does not capture actions when debug logging is disabled', () => {
  invoke({ type: 'editThought', foo: 'bar' })
  expect(debugLog.read()).toEqual([])
})

it('captures every action when debug logging is enabled', () => {
  debugLog.setEnabled(true)
  debugLog.clear()
  invoke({ type: 'editThought', newValue: 'hello' })
  const actionEntries = debugLog.read().filter(e => e.type === 'action')
  expect(actionEntries.length).toBe(1)
  expect(actionEntries[0].actionType).toBe('editThought')
  expect(actionEntries[0].payload).toContain('hello')
})

describe('structured updateThoughts summary', () => {
  it('logs per-thought id/value/rank/parentId and counts instead of the raw stringified action', () => {
    debugLog.setEnabled(true)
    debugLog.clear()
    invoke({
      type: 'updateThoughts',
      thoughtIndexUpdates: {
        abc: { id: 'abc', value: 'hello', rank: 2, parentId: 'root', childrenMap: {} },
        def: null,
      },
      persist: false,
    })
    const actionEntries = debugLog.read().filter(e => e.type === 'action')
    expect(actionEntries.length).toBe(1)
    expect(actionEntries[0]).toMatchObject({
      actionType: 'updateThoughts',
      thoughtCount: 2,
      persist: false,
    })
    expect(actionEntries[0].thoughts).toEqual([
      { id: 'abc', value: 'hello', rank: 2, parentId: 'root' },
      { id: 'def', deleted: true },
    ])
    expect(actionEntries[0].payload).toBeUndefined()
  })
})

describe('thought move logging', () => {
  beforeEach(initStore)

  it('logs canonical rank changes for every sibling affected by a move', () => {
    store.dispatch(
      importText({
        text: `
          - a
          - b
        `,
      }),
    )
    const oldRank = contextToThought(store.getState(), ['b'])!.rank

    debugLog.setEnabled(true)
    debugLog.clear()
    store.dispatch(moveThoughtAtFirstMatch({ from: ['b'], to: ['b'], after: null }))

    const moves = debugLog.read().filter(e => e.type === 'move')
    expect(moves).toHaveLength(2)
    expect(moves).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ actionType: 'moveThought', value: 'a', oldRank: 0, newRank: 1 }),
        expect.objectContaining({ actionType: 'moveThought', value: 'b', oldRank, newRank: 0 }),
      ]),
    )
  })

  it('logs a single moveBatch entry when one action reorders more than 10 thoughts', () => {
    const values = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k']
    store.dispatch(
      importText({
        text: values.map(value => `- ${value}`).join('\n'),
      }),
    )
    const thoughts = values.map(value => contextToThought(store.getState(), [value])!)
    const reordered = [...thoughts.slice(1), thoughts[0]]

    debugLog.setEnabled(true)
    debugLog.clear()
    // Move the first child to the end. All eleven canonical sibling indices change, even though rank values alone
    // are only planner hints; explicit placements are the document's ordering intent.
    store.dispatch(
      updateThoughts({
        thoughtIndexUpdates: Object.fromEntries(reordered.map((thought, rank) => [thought.id, { ...thought, rank }])),
        movePlacements: Object.fromEntries(
          reordered.map((thought, i) => [thought.id, i === 0 ? null : reordered[i - 1].id]),
        ),
      }),
    )

    expect(debugLog.read().filter(e => e.type === 'move')).toEqual([])
    const batches = debugLog.read().filter(e => e.type === 'moveBatch')
    expect(batches.length).toBe(1)
    expect(batches[0].count).toBe(11)
    expect((batches[0].sample as unknown[]).length).toBe(10)
  })
})

describe('duplicate rank integrity warning', () => {
  beforeEach(initStore)
  it('reports a corrupt projection without blocking the middleware consumer', () => {
    const stateBefore = runDocumentCommand(
      importTextReducer({
        text: `
          - a
          - b
        `,
      }),
      initialState(),
    )
    const a = contextToThought(stateBefore, ['a'])!
    const b = contextToThought(stateBefore, ['b'])!
    const stateCorrupt = {
      ...stateBefore,
      thoughts: {
        ...stateBefore.thoughts,
        thoughtIndex: {
          ...stateBefore.thoughts.thoughtIndex,
          [b.id]: { ...b, rank: a.rank },
        },
      },
    }
    // A canonical TreeCRDT projection cannot produce duplicate sibling ranks. Test the logger's corruption
    // diagnostic at its middleware boundary, independently of the document normalizer that prevents this state.
    const diagnosticStore = createStore<State, UnknownAction>(
      (state = stateBefore, action: UnknownAction) =>
        action.type === 'receiveCorruptProjection' ? stateCorrupt : state,
      applyMiddleware(loggerMiddleware),
    )
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    debugLog.setEnabled(true)
    debugLog.clear()
    diagnosticStore.dispatch({ type: 'receiveCorruptProjection' })

    const integrity = debugLog.read().filter(e => e.type === 'integrity')
    expect(integrity.length).toBe(1)
    expect(integrity[0]).toMatchObject({ issue: 'duplicateRank', rank: a.rank })
    expect(integrity[0].thoughts).toEqual([
      { id: a.id, value: 'a' },
      { id: b.id, value: 'b' },
    ])
    expect(consoleWarn).toHaveBeenCalled()
    // the update itself is not blocked
    expect(contextToThought(diagnosticStore.getState(), ['b'])!.rank).toBe(a.rank)
  })
})

describe('undo/redo attribution', () => {
  beforeEach(initStore)

  it('logs which action types an undo reverted', () => {
    store.dispatch(importText({ text: '- a' }))
    store.dispatch(editThoughtByContext(['a'], 'apple'))

    debugLog.setEnabled(true)
    debugLog.clear()
    store.dispatch(undo())

    const undoEntries = debugLog.read().filter(e => e.type === 'undo')
    expect(undoEntries.length).toBe(1)
    expect(undoEntries[0].actions).toContain('editThought')
    expect(undoEntries[0].steps).toBe(1)
  })
})
