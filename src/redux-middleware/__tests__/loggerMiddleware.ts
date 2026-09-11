import { vi } from 'vitest'
import State from '../../@types/State'
import { importTextActionCreator as importText } from '../../actions/importText'
import { undoActionCreator as undo } from '../../actions/undo'
import { updateThoughtsActionCreator as updateThoughts } from '../../actions/updateThoughts'
import store from '../../stores/app'
import contextToThought from '../../test-helpers/contextToThought'
import { editThoughtByContextActionCreator as editThoughtByContext } from '../../test-helpers/editThoughtByContext'
import initStore from '../../test-helpers/initStore'
import { moveThoughtAtFirstMatchActionCreator as moveThoughtAtFirstMatch } from '../../test-helpers/moveThoughtAtFirstMatch'
import debugLog from '../../util/debugLog'
import loggerMiddleware from '../loggerMiddleware'

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

beforeEach(() => {
  debugLog.setEnabled(false)
  debugLog.clear()
})

afterEach(() => {
  debugLog.setEnabled(false)
  debugLog.clear()
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
        abc: { id: 'abc', value: 'hello', rank: 2, parentId: 'root', childrenMap: {}, pending: true },
        def: null,
      },
      lexemeIndexUpdates: { lex1: {} },
      local: false,
      remote: false,
    })
    const actionEntries = debugLog.read().filter(e => e.type === 'action')
    expect(actionEntries.length).toBe(1)
    expect(actionEntries[0]).toMatchObject({
      actionType: 'updateThoughts',
      thoughtCount: 2,
      lexemeCount: 1,
      local: false,
      remote: false,
    })
    expect(actionEntries[0].thoughts).toEqual([
      { id: 'abc', value: 'hello', rank: 2, parentId: 'root', pending: true },
      { id: 'def', deleted: true },
    ])
    expect(actionEntries[0].payload).toBeUndefined()
  })
})

describe('thought move logging', () => {
  beforeEach(initStore)

  it('logs a move entry with the old and new rank when a thought is reordered', () => {
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
    store.dispatch(moveThoughtAtFirstMatch({ from: ['b'], to: ['b'], newRank: -1 }))

    const moves = debugLog.read().filter(e => e.type === 'move')
    expect(moves.length).toBe(1)
    expect(moves[0]).toMatchObject({
      actionType: 'moveThought',
      value: 'b',
      oldRank,
      newRank: -1,
    })
  })

  it('logs a single moveBatch entry when one action reorders more than 10 thoughts', () => {
    const values = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k']
    store.dispatch(
      importText({
        text: values.map(value => `- ${value}`).join('\n'),
      }),
    )
    const thoughts = values.map(value => contextToThought(store.getState(), [value])!)

    debugLog.setEnabled(true)
    debugLog.clear()
    // dispatched as a local update; a non-local (reconcile) update with an unchanged lastUpdated would be dropped by
    // updateThoughts' last-write-wins guard and never reach the state
    store.dispatch(
      updateThoughts({
        thoughtIndexUpdates: Object.fromEntries(
          thoughts.map(thought => [thought.id, { ...thought, rank: thought.rank + 100 }]),
        ),
        lexemeIndexUpdates: {},
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

  it('logs an integrity entry and warns when siblings end up with the same rank, without blocking the update', () => {
    store.dispatch(
      importText({
        text: `
          - a
          - b
        `,
      }),
    )
    const a = contextToThought(store.getState(), ['a'])!
    const b = contextToThought(store.getState(), ['b'])!
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    debugLog.setEnabled(true)
    debugLog.clear()
    // dispatched as a local update; a non-local (reconcile) update with an unchanged lastUpdated would be dropped by
    // updateThoughts' last-write-wins guard and never reach the state
    store.dispatch(
      updateThoughts({
        thoughtIndexUpdates: { [b.id]: { ...b, rank: a.rank } },
        lexemeIndexUpdates: {},
      }),
    )

    const integrity = debugLog.read().filter(e => e.type === 'integrity')
    expect(integrity.length).toBe(1)
    expect(integrity[0]).toMatchObject({ issue: 'duplicateRank', rank: a.rank })
    expect(integrity[0].thoughts).toEqual([
      { id: a.id, value: 'a' },
      { id: b.id, value: 'b' },
    ])
    expect(consoleWarn).toHaveBeenCalled()
    // the update itself is not blocked
    expect(contextToThought(store.getState(), ['b'])!.rank).toBe(a.rank)
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
