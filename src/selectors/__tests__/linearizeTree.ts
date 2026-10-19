import Path from '../../@types/Path'
import { importTextActionCreator as importText } from '../../actions/importText'
import { HOME_TOKEN } from '../../constants'
import db from '../../data-providers/thoughtspace'
import store from '../../stores/app'
import contextToThought from '../../test-helpers/contextToThought'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'
import hashPath from '../../util/hashPath'
import * as attributeEquals from '../attributeEquals'
import * as getChildren from '../getChildren'
import linearizeTree from '../linearizeTree'

beforeEach(initStore)
afterEach(waitForThoughtspaceIdle)
afterEach(vi.restoreAllMocks)

it('reads the shared sort attribute once for a group of siblings', () => {
  store.dispatch(importText({ text: '- a\n  - b\n  - c\n  - =sort\n    - Alphabetical', preventSetCursor: true }))
  const state = store.getState()
  const a = contextToThought(state, ['a'])!
  const path = [a.id] as Path
  const attributes = vi.spyOn(attributeEquals, 'default')

  const tree = linearizeTree(
    { ...state, expanded: { ...state.expanded, [hashPath(path)]: path } },
    { basePath: path, depth: 0 },
  )

  expect(tree.map(node => node.isInSortedContext)).toEqual([true, true])
  expect(attributes.mock.calls.filter(([, id, attr]) => id === a.id && attr === '=sort')).toHaveLength(1)
})

it('reads cursor children once to calculate autofocus for a traversal', () => {
  store.dispatch(importText({ text: '- a\n  - b\n  - c', preventSetCursor: true }))
  const state = store.getState()
  const path = [contextToThought(state, ['a'])!.id] as Path
  const hasChildren = vi.spyOn(getChildren, 'hasChildren')

  const tree = linearizeTree(
    { ...state, cursor: path, expanded: { ...state.expanded, [hashPath(path)]: path } },
    { basePath: path, depth: 0 },
  )

  expect(tree.map(node => node.autofocus)).toEqual(['show', 'show'])
  expect(hasChildren.mock.calls.filter(([, id]) => id === path[0])).toHaveLength(1)
})

it('reuses the visible tree when only multicursor execution state changes', () => {
  store.dispatch(importText({ text: '- a\n- b', preventSetCursor: true }))
  const state = store.getState()
  const a = contextToThought(state, ['a'])!
  const path = [a.id] as Path
  const tree = linearizeTree(state)

  const selectedTree = linearizeTree({
    ...state,
    isMulticursorExecuting: true,
    multicursorAnchor: path,
    multicursorRange: { [hashPath(path)]: path },
    multicursors: { [hashPath(path)]: path },
  })

  expect(selectedTree).toBe(tree)
})

it('invalidates the visible tree when the cursor or expansion changes', () => {
  store.dispatch(importText({ text: '- a\n  - x\n- b', preventSetCursor: true }))
  const state = store.getState()
  const a = contextToThought(state, ['a'])!
  const x = contextToThought(state, ['a', 'x'])!
  const b = contextToThought(state, ['b'])!
  const path = [a.id] as Path
  const collapsedTree = linearizeTree(state)

  const cursorTree = linearizeTree({ ...state, cursor: path })
  expect(cursorTree).not.toBe(collapsedTree)
  expect(cursorTree.find(node => node.thoughtId === a.id)?.isCursor).toBe(true)

  const expandedTree = linearizeTree({
    ...state,
    cursor: path,
    expanded: { ...state.expanded, [hashPath(path)]: path },
  })
  expect(expandedTree).not.toBe(cursorTree)
  expect(expandedTree.map(node => node.thoughtId)).toEqual([a.id, x.id, b.id])
})

it('invalidates the visible tree when a retained document reader advances', () => {
  store.dispatch(importText({ text: '- a', preventSetCursor: true }))
  const state = store.getState()
  const a = contextToThought(state, ['a'])!
  const before = linearizeTree(state)
  expect(before[0].isEmpty).toBe(false)

  db.transact(transaction => transaction.update({ thoughtIndexUpdates: { [a.id]: { ...a, value: '' } } }))

  const after = linearizeTree(state)
  expect(after).not.toBe(before)
  expect(after[0].thoughtId).toBe(a.id)
  expect(after[0].isEmpty).toBe(true)
})

it('reuses the visible tree when a preceding sibling has an ordinary text edit', () => {
  store.dispatch(importText({ text: '- a\n- b', preventSetCursor: true }))
  const state = store.getState()
  const a = contextToThought(state, ['a'])!
  const b = contextToThought(state, ['b'])!
  const before = linearizeTree(state)
  expect(before.map(node => node.thoughtId)).toEqual([a.id, b.id])

  store.dispatch(editThought(['a'], 'renamed'))

  const afterState = store.getState()
  expect(contextToThought(afterState, ['renamed'])?.id).toBe(a.id)
  expect(linearizeTree(afterState)).toBe(before)
})

it('reuses the visible tree when an expanded descendant has an ordinary text edit', () => {
  store.dispatch(importText({ text: '- a\n  - b\n  - c', preventSetCursor: true }))
  store.dispatch(setCursor(['a', 'b']))
  const state = store.getState()
  const a = contextToThought(state, ['a'])!
  const b = contextToThought(state, ['a', 'b'])!
  const c = contextToThought(state, ['a', 'c'])!
  const before = linearizeTree(state)
  expect(before.map(node => node.thoughtId)).toEqual([a.id, b.id, c.id])

  store.dispatch(editThought(['a', 'b'], 'renamed'))

  const afterState = store.getState()
  expect(contextToThought(afterState, ['a', 'renamed'])?.id).toBe(b.id)
  expect(linearizeTree(afterState)).toBe(before)
})

it.each([
  { context: ['a', '=children'], value: '=other', style: undefined },
  { context: ['a', '=children', '=style', 'marginLeft', '1em'], value: '2em', style: { marginLeft: '2em' } },
])('invalidates inherited styles when $context changes to $value', ({ context, value, style }) => {
  store.dispatch(
    importText({
      text: '- a\n  - b\n  - =children\n    - =style\n      - marginLeft\n        - 1em',
      preventSetCursor: true,
    }),
  )
  store.dispatch(setCursor(['a']))
  const state = store.getState()
  const b = contextToThought(state, ['a', 'b'])!
  const before = linearizeTree(state)
  expect(before.find(node => node.thoughtId === b.id)!.style).toEqual({ marginLeft: '1em' })

  store.dispatch(editThought(context, value))

  const after = linearizeTree(store.getState())
  expect(after).not.toBe(before)
  expect(after.find(node => node.thoughtId === b.id)!.style).toEqual(style)
})

it.each(['rename', 'membership'] as const)('invalidates a context view when its %s changes', change => {
  store.dispatch(importText({ text: '- a\n  - m\n- b\n  - m', preventSetCursor: true }))
  const state = store.getState()
  const a = contextToThought(state, ['a'])!
  const b = contextToThought(state, ['b'])!
  const m = contextToThought(state, ['a', 'm'])!
  const otherM = contextToThought(state, ['b', 'm'])!
  const parentPath = [a.id] as Path
  const path = [a.id, m.id] as Path
  const contextState = {
    ...state,
    cursor: path,
    contextViews: { [hashPath(path)]: true },
    expanded: { [hashPath(parentPath)]: parentPath, [hashPath(path)]: path },
  }
  const before = linearizeTree(contextState)
  expect(before.filter(node => node.showContexts).map(node => node.thoughtId)).toEqual([a.id, b.id])

  db.transact(transaction =>
    transaction.payload(change === 'rename' ? b.id : otherM.id, { value: change === 'rename' ? '0' : 'other' }),
  )

  const after = linearizeTree(contextState)
  expect(after).not.toBe(before)
  expect(after.filter(node => node.showContexts).map(node => node.thoughtId)).toEqual(
    change === 'rename' ? [b.id, a.id] : [],
  )
})

it('invalidates the visible tree when siblings move without changing payloads', () => {
  store.dispatch(importText({ text: '- a\n- b', preventSetCursor: true }))
  const state = store.getState()
  const a = contextToThought(state, ['a'])!
  const b = contextToThought(state, ['b'])!
  const before = linearizeTree(state)
  expect(before.map(node => node.thoughtId)).toEqual([a.id, b.id])

  db.transact(transaction => transaction.move(b.id, { parentId: HOME_TOKEN, afterId: null }))

  const after = linearizeTree(state)
  expect(after).not.toBe(before)
  expect(after.map(node => node.thoughtId)).toEqual([b.id, a.id])
})

it('reads layout changes inside a transaction and invalidates them after rollback', () => {
  store.dispatch(importText({ text: '- a', preventSetCursor: true }))
  const state = store.getState()
  const a = contextToThought(state, ['a'])!
  const before = linearizeTree(state)
  expect(before[0].isEmpty).toBe(false)

  expect(() =>
    db.transact(transaction => {
      transaction.payload(a.id, { value: '' })
      const during = linearizeTree(state)
      expect(during).not.toBe(before)
      expect(during[0].isEmpty).toBe(true)
      throw new Error('Cancel edit')
    }),
  ).toThrow('Cancel edit')

  const after = linearizeTree(state)
  expect(after).toEqual(before)
  expect(after[0].isEmpty).toBe(false)
})
