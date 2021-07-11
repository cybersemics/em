import { HOME_TOKEN } from '../../constants'
import { createId, equalArrays, initialState, reducerFlow } from '../../util'
import {
  exportContext,
  getContexts,
  getLexeme,
  getAllChildren,
  getChildrenRanked,
  getRankAfter,
  getChildren,
  isPending,
} from '../../selectors'
import { moveThought, importText, newSubthought, newThought, setCursor } from '../../reducers'
import checkDataIntegrity from '../../test-helpers/checkDataIntegrity'
import { State } from '../../util/initialState'
import { SimplePath } from '../../@types'
import { store as appStore } from '../../store'
import testTimer from '../../test-helpers/testTimer'
import { initialize } from '../../initialize'
import { clear, importText as importTextAction, moveThought as existingThoughtMoveAction } from '../../action-creators'
import { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'

const timer = testTimer()

it('move within root', () => {
  const steps = [
    newThought('a'),
    newThought('b'),
    moveThought({
      oldPath: [{ id: createId(), value: 'b', rank: 1 }],
      newPath: [{ id: createId(), value: 'b', rank: -1 }],
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - b
  - a`)

  // b should exist in the ROOT context
  expect(getContexts(stateNew, 'b')).toMatchObject([
    {
      context: [HOME_TOKEN],
      rank: -1,
    },
  ])
})

it('persist id on move', () => {
  const steps1 = [newThought('a'), newSubthought('a1'), newSubthought('a2')]

  const stateNew1 = reducerFlow(steps1)(initialState())
  const oldExactThought = getLexeme(stateNew1, 'a2')!.contexts.find(
    thought => equalArrays(thought.context, ['a', 'a1']) && thought.rank === 0,
  )
  const oldId = oldExactThought?.id

  const steps2 = [
    moveThought({
      oldPath: [
        { id: createId(), value: 'a', rank: 0 },
        { id: createId(), value: 'a1', rank: 0 },
      ],
      newPath: [{ id: createId(), value: 'a1', rank: 1 }],
    }),
  ]

  const stateNew2 = reducerFlow(steps2)(stateNew1)
  const newExactThought = getLexeme(stateNew2, 'a2')!.contexts.find(
    thought => equalArrays(thought.context, ['a1']) && thought.rank === 0,
  )
  const newId = newExactThought?.id

  expect(oldId).toEqual(newId)
})

it('move within context', () => {
  const steps = [
    newThought('a'),
    newSubthought('a1'),
    newThought('a2'),
    moveThought({
      oldPath: [
        { id: createId(), value: 'a', rank: 0 },
        { id: createId(), value: 'a2', rank: 1 },
      ],
      newPath: [
        { id: createId(), value: 'a', rank: 0 },
        { id: createId(), value: 'a2', rank: -1 },
      ],
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - a2
    - a1`)

  // context of a2 should remain unchanged
  expect(getContexts(stateNew, 'a2')).toMatchObject([
    {
      context: ['a'],
      rank: -1,
    },
  ])
})

it('move across contexts', () => {
  const steps = [
    newThought('a'),
    newSubthought('a1'),
    newThought({ value: 'b', at: [{ id: createId(), value: 'a', rank: 0 }] }),
    newSubthought('b1'),
    moveThought({
      oldPath: [
        { id: createId(), value: 'b', rank: 0 },
        { id: createId(), value: 'b1', rank: 0 },
      ],
      newPath: [
        { id: createId(), value: 'a', rank: 0 },
        { id: createId(), value: 'b1', rank: 1 },
      ],
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - a1
    - b1
  - b`)

  // b1 should exist in context a
  expect(getContexts(stateNew, 'b1')).toMatchObject([
    {
      context: ['a'],
      rank: 1,
    },
  ])
})

it('move descendants', () => {
  const steps = [
    newThought('a'),
    newSubthought('a1'),
    newSubthought('a1.1'),
    newThought({ value: 'b', at: [{ id: createId(), value: 'a', rank: 0 }] }),
    newSubthought('b1'),
    newSubthought('b1.1'),
    moveThought({
      oldPath: [{ id: createId(), value: 'b', rank: 1 }],
      newPath: [{ id: createId(), value: 'b', rank: -1 }],
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - b
    - b1
      - b1.1
  - a
    - a1
      - a1.1`)

  // context of b should remain to be ROOT
  expect(getContexts(stateNew, 'b')).toMatchObject([
    {
      context: [HOME_TOKEN],
      rank: -1,
    },
  ])

  // contexts of both the descendants of b should change
  expect(getContexts(stateNew, 'b1')).toMatchObject([
    {
      context: ['b'],
      rank: 0,
    },
  ])
  expect(getContexts(stateNew, 'b1.1')).toMatchObject([
    {
      context: ['b', 'b1'],
      rank: 0,
    },
  ])
})

it('moving cursor thought should update cursor', () => {
  const steps = [
    newThought('a'),
    newSubthought('a1'),
    newThought('a2'),
    moveThought({
      oldPath: [
        { id: createId(), value: 'a', rank: 0 },
        { id: createId(), value: 'a2', rank: 1 },
      ],
      newPath: [
        { id: createId(), value: 'a', rank: 0 },
        { id: createId(), value: 'a2', rank: -1 },
      ],
    }),
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor).toMatchObject([
    { value: 'a', rank: 0 },
    { value: 'a2', rank: -1 },
  ])
})

it('moving ancestor of cursor should update cursor', () => {
  const steps = [
    newThought('a'),
    newThought('b'),
    newSubthought('b1'),
    newSubthought('b1.1'),
    moveThought({
      oldPath: [{ id: createId(), value: 'b', rank: 1 }],
      newPath: [{ id: createId(), value: 'b', rank: -1 }],
    }),
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor).toMatchObject([
    { value: 'b', rank: -1 },
    { value: 'b1', rank: 0 },
    { value: 'b1.1', rank: 0 },
  ])
})

it('moving unrelated thought should not update cursor', () => {
  const steps = [
    newThought('a'),
    newThought('b'),
    newSubthought('b1'),
    newSubthought('b1.1'),
    setCursor({ path: [{ id: createId(), value: 'a', rank: 0 }] }),
    moveThought({
      oldPath: [{ id: createId(), value: 'b', rank: 1 }],
      newPath: [{ id: createId(), value: 'b', rank: -1 }],
    }),
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor).toMatchObject([{ value: 'a', rank: 0 }])
})

it('move root thought into another root thought', () => {
  const text = `
  - x
  - a
    - b
     - c`

  const steps = [
    importText({ text }),
    moveThought({
      oldPath: [{ id: createId(), value: 'a', rank: 1 }],
      newPath: [
        { id: createId(), value: 'x', rank: 0 },
        { id: createId(), value: 'a', rank: 0 },
      ],
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - x
    - a
      - b
        - c`)

  expect(getContexts(stateNew, 'a')).toMatchObject([
    {
      context: ['x'],
      rank: 0,
    },
  ])

  expect(getContexts(stateNew, 'b')).toMatchObject([
    {
      context: ['x', 'a'],
      rank: 0,
    },
  ])
  expect(getContexts(stateNew, 'c')).toMatchObject([
    {
      context: ['x', 'a', 'b'],
      rank: 0,
    },
  ])
})

// ensure that siblings of descendants are properly merged into final result
it('move descendants with siblings', () => {
  const text = `
  - a
    - b
     - c
     - d`

  const steps = [
    importText({ text }),
    moveThought({
      oldPath: [
        { id: createId(), value: 'a', rank: 0 },
        { id: createId(), value: 'b', rank: 0 },
      ],
      newPath: [{ id: createId(), value: 'b', rank: 1 }],
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
  - b
    - c
    - d`)

  // b should exist in the ROOT context
  expect(getContexts(stateNew, 'b')).toMatchObject([
    {
      context: [HOME_TOKEN],
      rank: 1,
    },
  ])

  // context for both the descendants of b should change
  expect(getContexts(stateNew, 'c')).toMatchObject([
    {
      context: ['b'],
      rank: 0,
    },
  ])
  expect(getContexts(stateNew, 'd')).toMatchObject([
    {
      context: ['b'],
      rank: 1,
    },
  ])
})

it('merge duplicate with new rank', () => {
  const text = `
  - a
    - m
      - x
  - m
   - y`

  const steps = [
    importText({ text }),
    moveThought({
      oldPath: [{ id: createId(), value: 'm', rank: 1 }],
      newPath: [
        { id: createId(), value: 'a', rank: 0 },
        { id: createId(), value: 'm', rank: 0 },
      ],
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - m
      - x
      - y`)

  // use destinate rank of duplicate thoughts
  expect(getAllChildren(stateNew, ['a'])).toMatchObject([{ value: 'm', rank: 0 }])

  // merged thought should only exist in destination context
  expect(getContexts(stateNew, 'm')).toMatchObject([
    {
      context: ['a'],
      rank: 0,
    },
  ])
})

it('merge with duplicate with duplicate rank', () => {
  const text = `
  - a
    - m
      - x
  - m
    - y`

  const steps = [
    importText({ text }),
    moveThought({
      oldPath: [{ id: createId(), value: 'm', rank: 1 }],
      newPath: [
        { id: createId(), value: 'a', rank: 0 },
        { id: createId(), value: 'm', rank: 0 },
      ],
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - m
      - x
      - y`)

  // use destinate rank of duplicate thoughts
  expect(getAllChildren(stateNew, ['a'])).toMatchObject([{ value: 'm', rank: 0 }])

  // merged thought should only exist in destination context
  expect(getContexts(stateNew, 'm')).toMatchObject([
    {
      context: ['a'],
      rank: 0,
    },
  ])
})

it('move with duplicate descendant', () => {
  const text = `
  - a
  - b
    - x
    - y
      - x`

  const steps = [
    importText({ text }),
    moveThought({
      oldPath: [{ id: createId(), value: 'b', rank: 1 }],
      newPath: [
        { id: createId(), value: 'a', rank: 0 },
        { id: createId(), value: 'b', rank: 0 },
      ],
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  // contextIndex
  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
      - x
      - y
        - x`)

  // x should have contexts a/b and a/b/y
  expect(getContexts(stateNew, 'x')).toMatchObject([
    { context: ['a', 'b'], rank: 0 },
    { context: ['a', 'b', 'y'], rank: 0 },
  ])
})

it('move with hash matched descendant', () => {
  const text = `
  - a
  - b
    - =note
      - note`

  const steps = [
    importText({ text }),
    moveThought({
      oldPath: [{ id: createId(), value: 'b', rank: 1 }],
      newPath: [
        { id: createId(), value: 'a', rank: 0 },
        { id: createId(), value: 'b', rank: 0 },
      ],
    }),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
      - =note
        - note`)

  // note should have contexts a/b and a/b/=note
  expect(getContexts(stateNew, 'note')).toMatchObject([
    { context: ['a', 'b'], rank: 0 },
    { context: ['a', 'b', '=note'], rank: 0 },
  ])
})

it('move with nested duplicate thoughts', () => {
  const text = `
  - a
    - b
  - c
    - a
      - b`

  const steps = [
    importText({ text }),
    moveThought({
      oldPath: [
        { id: createId(), value: 'c', rank: 1 },
        { id: createId(), value: 'a', rank: 0 },
      ],
      newPath: [{ id: createId(), value: 'a', rank: 0 }],
    }),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
  - c`)

  // b should be in in the context of a
  expect(getContexts(stateNew, 'b')).toMatchObject([{ context: ['a'], rank: 0 }])
})

it('move with nested duplicate thoughts and merge their children', () => {
  const text = `
  - a
    - b
     - c
      - x
  - p
    - a
      - b
        - c
          - y
        -d`

  const steps = [
    importText({ text }),
    moveThought({
      oldPath: [
        { id: createId(), value: 'p', rank: 1 },
        { id: createId(), value: 'a', rank: 0 },
      ],
      newPath: [{ id: createId(), value: 'a', rank: 0 }],
    }),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
      - c
        - x
        - y
      - d
  - p`)

  // b should only be in context ['a']
  expect(getContexts(stateNew, 'b')).toMatchObject([{ context: ['a'], rank: 0 }])

  // context ['p', 'a'] should not have any garbage children
  expect(getChildrenRanked(stateNew, ['p', 'a'])).toHaveLength(0)

  // c should only be in context ['a', 'b']
  expect(getContexts(stateNew, 'c')).toMatchObject([{ context: ['a', 'b'], rank: 0 }])

  // context ['p', 'a', 'b'] should not have any garbage children
  expect(getChildrenRanked(stateNew, ['p', 'a', 'b'])).toHaveLength(0)
})

// Issue: https://github.com/cybersemics/em/issues/1096
it('data integrity test', () => {
  const text = `
  - k
    - a
      - b
        - c
  - m`

  const steps = [
    importText({ text }),
    moveThought({
      oldPath: [
        { id: createId(), value: 'k', rank: 0 },
        { id: createId(), value: 'a', rank: 0 },
      ],
      newPath: [
        { id: createId(), value: 'm', rank: 1 },
        { id: createId(), value: 'a', rank: 0 },
      ],
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const { thoughtIndexUpdates, contextIndexUpdates } = checkDataIntegrity(stateNew)

  const thoughtUpdates = Object.keys(thoughtIndexUpdates).length
  const contextUpdates = Object.keys(contextIndexUpdates).length

  expect(thoughtUpdates).toBe(0)
  expect(contextUpdates).toBe(0)
})

it('consitent rank between thoughtIndex and contextIndex on duplicate merge', () => {
  const text = `
  - a
    - b
  - b`

  const steps = [
    importText({ text }),
    (state: State) =>
      moveThought(state, {
        oldPath: [
          { id: createId(), value: 'a', rank: 0 },
          { id: createId(), value: 'b', rank: 0 },
        ],
        // Note: Here new rank will be 0.5 because it's calculated between a (0) and b (1)
        newPath: [{ id: createId(), value: 'b', rank: getRankAfter(state, [{ value: 'a', rank: 0 }] as SimplePath) }],
      }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const contextsOfB = getContexts(stateNew, 'b')

  expect(contextsOfB).toHaveLength(1)

  const rankFromContextIndex = getChildren(stateNew, [HOME_TOKEN]).find(child => child.value === 'b')?.rank

  expect(contextsOfB[0].rank).toBe(rankFromContextIndex)
})

it('pending destination should be merged correctly (fetch pending before move)', async () => {
  initialize()

  const text = `
  - a
    - b
      -c
        - one
        - two
  - d
    - b
      - c
        - three
        - four`

  timer.useFakeTimer()

  appStore.dispatch(importTextAction({ text }))
  await timer.runAllAsync()

  timer.useFakeTimer()
  // clear and call initialize again to reload from local db (simulating page refresh)
  appStore.dispatch(clear())
  await timer.runAllAsync()

  initialize()

  await timer.runAllAsync()

  timer.useFakeTimer()

  appStore.dispatch([setCursorFirstMatchActionCreator(['a'])])

  // wait for pullBeforeMove middleware to execute
  await timer.runAllAsync()

  appStore.dispatch([
    existingThoughtMoveAction({
      oldPath: [
        { id: createId(), value: 'a', rank: 0 },
        { id: createId(), value: 'b', rank: 0 },
      ],
      newPath: [
        { id: createId(), value: 'd', rank: 1 },
        { id: createId(), value: 'b', rank: 1 },
      ],
    }),
  ])
  await timer.runAllAsync()

  timer.useRealTimer()

  const mergedChildren = getAllChildren(appStore.getState(), ['d', 'b', 'c'])
  expect(mergedChildren).toMatchObject([
    { value: 'three', rank: 0 },
    { value: 'four', rank: 1 },
    { value: 'one', rank: 2 },
    { value: 'two', rank: 3 },
  ])
})

it('only fetch the descendants upto the possible conflicting path', async () => {
  initialize()

  const text = `
  - a
    - b
      -c
        - 1
        - 2
  - p
    - b
      - c
        - 3
          - 3.1
          - 3.2
            - 3.2.1
        - 4`

  timer.useFakeTimer()

  appStore.dispatch(importTextAction({ text }))
  await timer.runAllAsync()

  timer.useFakeTimer()
  // clear and call initialize again to reload from local db (simulating page refresh)
  appStore.dispatch(clear())
  await timer.runAllAsync()

  initialize()

  await timer.runAllAsync()

  timer.useFakeTimer()

  expect(isPending(appStore.getState(), ['p', 'b'])).toEqual(true)
  appStore.dispatch([setCursorFirstMatchActionCreator(['a'])])

  // wait for pullBeforeMove middleware to execute
  await timer.runAllAsync()

  appStore.dispatch([
    existingThoughtMoveAction({
      oldPath: [
        { id: createId(), value: 'a', rank: 0 },
        { id: createId(), value: 'b', rank: 0 },
      ],
      newPath: [
        { id: createId(), value: 'p', rank: 1 },
        { id: createId(), value: 'b', rank: 1 },
      ],
    }),
  ])
  await timer.runAllAsync()

  timer.useRealTimer()

  expect(isPending(appStore.getState(), ['p', 'b'])).toEqual(false)
  expect(isPending(appStore.getState(), ['p', 'b', 'c', '3'])).toEqual(true)
})
