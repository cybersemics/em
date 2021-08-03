import { HOME_TOKEN } from '../../constants'
import { hashContext, initialState, reducerFlow } from '../../util'
import {
  exportContext,
  getContexts,
  getLexeme,
  getAllChildren,
  getChildrenRanked,
  getRankAfter,
  getChildren,
  isPending,
  getParent,
} from '../../selectors'
import { moveThought, importText, newSubthought, newThought, setCursor } from '../../reducers'
// import checkDataIntegrity from '../../test-helpers/checkDataIntegrity'
import { State, SimplePath } from '../../@types'
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
    (newState: State) =>
      moveThought(newState, {
        oldPath: [{ id: hashContext(newState, ['b']) || '', value: 'b', rank: 1 }],
        newPath: [{ id: hashContext(newState, ['b']) || '', value: 'b', rank: -1 }],
      }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - b
  - a`)

  const thought = getParent(stateNew, ['b'])
  expect(thought).not.toBeNull()

  // b should exist in the ROOT context
  expect(getContexts(stateNew, 'b')).toMatchObject([
    {
      id: thought!.id,
      rank: -1,
    },
  ])
})

it('persist id on move', () => {
  const steps1 = [newThought('a'), newSubthought('a1'), newSubthought('a2')]

  const stateNew1 = reducerFlow(steps1)(initialState())

  const thoughtA2 = getParent(stateNew1, ['a', 'a1', 'a2'])

  expect(thoughtA2).not.toBeNull()

  const oldExactThought = getLexeme(stateNew1, 'a2')!.contexts.find(
    thought => thought.id === thoughtA2!.id && thought.rank === 0,
  )

  expect(oldExactThought).not.toBeNull()

  const oldId = oldExactThought!.id

  const steps2 = [
    (newState: State) =>
      moveThought(newState, {
        oldPath: [
          { id: hashContext(newState, ['b']) || '', value: 'a', rank: 0 },
          { id: hashContext(newState, ['b', 'a1']) || '', value: 'a1', rank: 0 },
        ],
        newPath: [{ id: hashContext(newState, ['a1']) || '', value: 'a1', rank: 1 }],
      }),
  ]

  const stateNew2 = reducerFlow(steps2)(stateNew1)
  const newExactThought = getLexeme(stateNew2, 'a2')!.contexts.find(
    thought => thoughtA2!.id === thought.id && thought.rank === 0,
  )

  expect(newExactThought).not.toBeNull()

  expect(oldId).toEqual(newExactThought!.id)
})

it('move within context', () => {
  const steps = [
    newThought('a'),
    newSubthought('a1'),
    newThought('a2'),
    (newState: State) =>
      moveThought(newState, {
        oldPath: [
          { id: hashContext(newState, ['a']) || '', value: 'a', rank: 0 },
          { id: hashContext(newState, ['a', 'a2']) || '', value: 'a2', rank: 1 },
        ],
        newPath: [
          { id: hashContext(newState, ['a']) || '', value: 'a', rank: 0 },
          { id: hashContext(newState, ['a', 'a2']) || '', value: 'a2', rank: -1 },
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

  const thoughtA = getParent(stateNew, ['a'])
  const thoughtA2 = getParent(stateNew, ['a', 'a2'])

  expect(thoughtA).not.toBeNull()
  expect(thoughtA2).not.toBeNull()

  expect(thoughtA2?.parentId).toBe(thoughtA?.id)

  expect(getContexts(stateNew, 'a2')).toMatchObject([
    {
      id: thoughtA2!.id,
      rank: -1,
    },
  ])
})

it('move across contexts', () => {
  const steps = [
    newThought('a'),
    newSubthought('a1'),
    (newState: State) =>
      newThought(newState, { value: 'b', at: [{ id: hashContext(newState, ['b']) || '', value: 'a', rank: 0 }] }),
    newSubthought('b1'),
    (newState: State) =>
      moveThought(newState, {
        oldPath: [
          { id: hashContext(newState, ['b']) || '', value: 'b', rank: 0 },
          { id: hashContext(newState, ['b', 'b1']) || '', value: 'b1', rank: 0 },
        ],
        newPath: [
          { id: hashContext(newState, ['a']) || '', value: 'a', rank: 0 },
          { id: hashContext(newState, ['a', 'b1']) || '', value: 'b1', rank: 1 },
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

  const thoughtA = getParent(stateNew, ['a'])
  const thoughtB1 = getParent(stateNew, ['a', 'b1'])

  expect(thoughtA).not.toBeNull()
  expect(thoughtB1).not.toBeNull()

  expect(thoughtB1!.parentId).toBe(thoughtA!.id)
  // b1 should exist in context a
  expect(getContexts(stateNew, 'b1')).toMatchObject([
    {
      id: thoughtB1!.id,
      rank: 1,
    },
  ])
})

it('move descendants', () => {
  const steps = [
    newThought('a'),
    newSubthought('a1'),
    newSubthought('a1.1'),
    (newState: State) =>
      newThought(newState, { value: 'b', at: [{ id: hashContext(newState, ['b']) || '', value: 'a', rank: 0 }] }),
    newSubthought('b1'),
    newSubthought('b1.1'),
    (newState: State) =>
      moveThought(newState, {
        oldPath: [{ id: hashContext(newState, ['b']) || '', value: 'b', rank: 1 }],
        newPath: [{ id: hashContext(newState, ['b']) || '', value: 'b', rank: -1 }],
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

  const thoughtB = getParent(stateNew, ['b'])
  const thoughtB1 = getParent(stateNew, ['b', 'b1'])
  const thoughtB11 = getParent(stateNew, ['b', 'b1', 'b1.1'])

  expect(thoughtB).not.toBeNull()
  expect(thoughtB1).not.toBeNull()
  expect(thoughtB11).not.toBeNull()

  // on desendent only the moved thought parentId may change, all its descendants will have same back link to their parents.
  expect(thoughtB1!.parentId).toBe(thoughtB!.id)
  expect(thoughtB11!.parentId).toBe(thoughtB1!.id)

  // Checking if the lexeme has correct reference to the thought after move.
  expect(getContexts(stateNew, 'b')).toMatchObject([
    {
      id: thoughtB!.id,
      rank: -1,
    },
  ])

  expect(getContexts(stateNew, 'b1')).toMatchObject([
    {
      id: thoughtB1!.id,
      rank: 0,
    },
  ])
  expect(getContexts(stateNew, 'b1.1')).toMatchObject([
    {
      id: thoughtB11!.id,
      rank: 0,
    },
  ])
})

it('moving cursor thought should update cursor', () => {
  const steps = [
    newThought('a'),
    newSubthought('a1'),
    newThought('a2'),
    (newState: State) =>
      moveThought(newState, {
        oldPath: [
          { id: hashContext(newState, ['a']) || '', value: 'a', rank: 0 },
          { id: hashContext(newState, ['a', 'a2']) || '', value: 'a2', rank: 1 },
        ],
        newPath: [
          { id: hashContext(newState, ['a']) || '', value: 'a', rank: 0 },
          { id: hashContext(newState, ['a', 'a2']) || '', value: 'a2', rank: -1 },
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
    (newState: State) =>
      moveThought(newState, {
        oldPath: [{ id: hashContext(newState, ['b']) || '', value: 'b', rank: 1 }],
        newPath: [{ id: hashContext(newState, ['b']) || '', value: 'b', rank: -1 }],
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
    (newState: State) =>
      setCursor(newState, { path: [{ id: hashContext(newState, ['a']) || '', value: 'a', rank: 0 }] }),
    (newState: State) =>
      moveThought(newState, {
        oldPath: [{ id: hashContext(newState, ['b']) || '', value: 'b', rank: 1 }],
        newPath: [{ id: hashContext(newState, ['b']) || '', value: 'b', rank: -1 }],
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
    (newState: State) =>
      moveThought(newState, {
        oldPath: [{ id: hashContext(newState, ['a']) || '', value: 'a', rank: 1 }],
        newPath: [
          { id: hashContext(newState, ['x']) || '', value: 'x', rank: 0 },
          { id: hashContext(newState, ['x', 'a']) || '', value: 'a', rank: 0 },
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

  const thoughtA = getParent(stateNew, ['x', 'a'])
  const thoughtB = getParent(stateNew, ['x', 'a', 'b'])
  const thoughtC = getParent(stateNew, ['x', 'a', 'b', 'c'])

  expect(thoughtA).toBeTruthy()
  expect(thoughtB).toBeTruthy()
  expect(thoughtC).toBeTruthy()

  expect(getContexts(stateNew, 'a')).toMatchObject([
    {
      id: thoughtA!.id,
      rank: 0,
    },
  ])

  expect(getContexts(stateNew, 'b')).toMatchObject([
    {
      id: thoughtB!.id,
      rank: 0,
    },
  ])
  expect(getContexts(stateNew, 'c')).toMatchObject([
    {
      id: thoughtC!.id,
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
    (newState: State) =>
      moveThought(newState, {
        oldPath: [
          { id: hashContext(newState, ['a']) || '', value: 'a', rank: 0 },
          { id: hashContext(newState, ['a', 'b']) || '', value: 'b', rank: 0 },
        ],
        newPath: [{ id: hashContext(newState, ['b']) || '', value: 'b', rank: 1 }],
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

  const thoughtB = getParent(stateNew, ['b'])
  const thoughtC = getParent(stateNew, ['b', 'c'])
  const thoughtD = getParent(stateNew, ['b', 'd'])

  expect(thoughtB).not.toBeNull()
  expect(thoughtC).not.toBeNull()
  expect(thoughtD).not.toBeNull()

  expect(thoughtC!.parentId).toBe(thoughtB!.id)
  expect(thoughtD!.parentId).toBe(thoughtB!.id)

  // b should exist in the ROOT context
  expect(getContexts(stateNew, 'b')).toMatchObject([
    {
      id: thoughtB!.id,
      rank: 1,
    },
  ])

  // context for both the descendants of b should change
  expect(getContexts(stateNew, 'c')).toMatchObject([
    {
      id: thoughtC!.id,
      rank: 0,
    },
  ])
  expect(getContexts(stateNew, 'd')).toMatchObject([
    {
      id: thoughtD!.id,
      rank: 1,
    },
  ])
})

// @MIGRATION_TODO: Merge logic has not been fixed.
it.skip('merge duplicate with new rank', () => {
  const text = `
  - a
    - m
      - x
  - m
   - y`

  const steps = [
    importText({ text }),
    (newState: State) =>
      moveThought(newState, {
        oldPath: [{ id: hashContext(newState, ['m']) || '', value: 'm', rank: 1 }],
        newPath: [
          { id: hashContext(newState, ['a']) || '', value: 'a', rank: 0 },
          // Note: Here we are using id of thought ['m'] instead of ['a', 'm'] because we want merge thought to take the id of the moved thought. We can change it to take id of the duplicate thought i.e ['a', 'm'] later.
          { id: hashContext(newState, ['m']) || '', value: 'm', rank: 0 },
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

it.skip('merge with duplicate with duplicate rank', () => {
  const text = `
  - a
    - m
      - x
  - m
    - y`

  const steps = [
    importText({ text }),
    (newState: State) =>
      moveThought(newState, {
        oldPath: [{ id: hashContext(newState, ['m']) || '', value: 'm', rank: 1 }],
        newPath: [
          { id: hashContext(newState, ['a']) || '', value: 'a', rank: 0 },
          { id: hashContext(newState, ['a', 'm']) || '', value: 'm', rank: 0 },
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
    (newState: State) =>
      moveThought(newState, {
        oldPath: [{ id: hashContext(newState, ['b']) || '', value: 'b', rank: 1 }],
        newPath: [
          { id: hashContext(newState, ['a']) || '', value: 'a', rank: 0 },
          { id: hashContext(newState, ['a', 'b']) || '', value: 'b', rank: 0 },
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

  const thoughtXUnderB = getParent(stateNew, ['a', 'b', 'x'])
  const thoughtXUnderY = getParent(stateNew, ['a', 'b', 'y', 'x'])

  expect(thoughtXUnderB).toBeTruthy()
  expect(thoughtXUnderY).toBeTruthy()

  // x should have contexts a/b and a/b/y
  expect(getContexts(stateNew, 'x')).toMatchObject([
    { id: thoughtXUnderB!.id, rank: 0 },
    { id: thoughtXUnderY!.id, rank: 0 },
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
    (newState: State) =>
      moveThought(newState, {
        oldPath: [{ id: hashContext(newState, ['b']) || '', value: 'b', rank: 1 }],
        newPath: [
          { id: hashContext(newState, ['a']) || '', value: 'a', rank: 0 },
          { id: hashContext(newState, ['a', 'b']) || '', value: 'b', rank: 0 },
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

  const thoughtNoteFirst = getParent(stateNew, ['a', 'b', '=note'])
  const thoughtNoteSecond = getParent(stateNew, ['a', 'b', '=note', 'note'])

  expect(thoughtNoteFirst).toBeTruthy()
  expect(thoughtNoteSecond).toBeTruthy()

  expect(thoughtNoteSecond?.parentId).toBe(thoughtNoteFirst!.id)

  expect(getContexts(stateNew, 'note')).toMatchObject([
    { id: thoughtNoteFirst!.id, rank: 0 },
    { id: thoughtNoteSecond!.id, rank: 0 },
  ])
})

// @MIGRATION_TODO: Duplicate merging has not been fixed yet.
it.skip('move with nested duplicate thoughts', () => {
  const text = `
  - a
    - b
  - c
    - a
      - b`

  const steps = [
    importText({ text }),
    (newState: State) =>
      moveThought(newState, {
        oldPath: [
          { id: hashContext(newState, ['c']) || '', value: 'c', rank: 1 },
          { id: hashContext(newState, ['c', 'a']) || '', value: 'a', rank: 0 },
        ],
        newPath: [{ id: hashContext(newState, ['a']) || '', value: 'a', rank: 0 }],
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

// @MIGRATION_TODO: Nested duplciate merge doesn't work rn with intermediate changes.
it.skip('move with nested duplicate thoughts and merge their children', () => {
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
    (newState: State) =>
      moveThought(newState, {
        oldPath: [
          { id: hashContext(newState, ['p']) || '', value: 'p', rank: 1 },
          { id: hashContext(newState, ['p', 'a']) || '', value: 'a', rank: 0 },
        ],
        newPath: [{ id: hashContext(newState, ['a']) || '', value: 'a', rank: 0 }],
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

// @MIGRATION_TODO: Nested duplciate merge doesn't work rn with intermediate changes.
// Issue: https://github.com/cybersemics/em/issues/1096
it.skip('data integrity test', () => {
  // const text = `
  // - k
  //   - a
  //     - b
  //       - c
  // - m`
  // const steps = [
  //   importText({ text }),
  //   (newState: State) =>
  //     moveThought(newState, {
  //       oldPath: [
  //         { id: hashContext(newState, ['k']) || '', value: 'k', rank: 0 },
  //         { id: hashContext(newState, ['k', 'a']) || '', value: 'a', rank: 0 },
  //       ],
  //       newPath: [
  //         { id: hashContext(newState, ['m']) || '', value: 'm', rank: 1 },
  //         { id: hashContext(newState, ['m', 'a']) || '', value: 'a', rank: 0 },
  //       ],
  //     }),
  // ]
  // run steps through reducer flow and export as plaintext for readable test
  // const stateNew = reducerFlow(steps)(initialState())
  // const { thoughtIndexUpdates, contextIndexUpdates } = checkDataIntegrity(stateNew)
  // const thoughtUpdates = Object.keys(thoughtIndexUpdates).length
  // const contextUpdates = Object.keys(contextIndexUpdates).length
  // expect(thoughtUpdates).toBe(0)
  // expect(contextUpdates).toBe(0)
})

// @MIGRATION_TODO: Duplicate meege is not working yet.
it.skip('consitent rank between thoughtIndex and contextIndex on duplicate merge', () => {
  const text = `
  - a
    - b
  - b`

  const steps = [
    importText({ text }),
    (state: State) =>
      moveThought(state, {
        oldPath: [
          { id: hashContext(state, ['a']) || '', value: 'a', rank: 0 },
          { id: hashContext(state, ['a', 'b']) || '', value: 'b', rank: 0 },
        ],
        // Note: Here new rank will be 0.5 because it's calculated between a (0) and b (1)
        newPath: [
          {
            id: hashContext(state, ['b']) || '',
            value: 'b',
            rank: getRankAfter(state, [{ value: 'a', rank: 0 }] as SimplePath),
          },
        ],
      }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const contextsOfB = getContexts(stateNew, 'b')

  expect(contextsOfB).toHaveLength(1)

  const rankFromContextIndex = getChildren(stateNew, [HOME_TOKEN]).find(child => child.value === 'b')?.rank

  expect(contextsOfB[0].rank).toBe(rankFromContextIndex)
})

// @MIGRATION_TODO
it.skip('pending destination should be merged correctly (fetch pending before move)', async () => {
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
        { id: hashContext(appStore.getState(), ['a']) || '', value: 'a', rank: 0 },
        { id: hashContext(appStore.getState(), ['a', 'b']) || '', value: 'b', rank: 0 },
      ],
      newPath: [
        { id: hashContext(appStore.getState(), ['d']) || '', value: 'd', rank: 1 },
        { id: hashContext(appStore.getState(), ['d', 'b']) || '', value: 'b', rank: 1 },
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

// @MIGRATION_TODO:
it.skip('only fetch the descendants upto the possible conflicting path', async () => {
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
        { id: hashContext(appStore.getState(), ['a']) || '', value: 'a', rank: 0 },
        { id: hashContext(appStore.getState(), ['a', 'b']) || '', value: 'b', rank: 0 },
      ],
      newPath: [
        { id: hashContext(appStore.getState(), ['p']) || '', value: 'p', rank: 1 },
        { id: hashContext(appStore.getState(), ['p', 'b']) || '', value: 'b', rank: 1 },
      ],
    }),
  ])
  await timer.runAllAsync()

  timer.useRealTimer()

  expect(isPending(appStore.getState(), ['p', 'b'])).toEqual(false)
  expect(isPending(appStore.getState(), ['p', 'b', 'c', '3'])).toEqual(true)
})
