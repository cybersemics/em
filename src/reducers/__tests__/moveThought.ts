import { HOME_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import {
  exportContext,
  getContexts,
  getLexeme,
  getAllChildren,
  getChildrenRanked,
  getRankAfter,
  isPending,
  getThoughtByContext,
  getThoughtByPath,
  rankThoughtsFirstMatch,
  childIdsToThoughts,
} from '../../selectors'
import { importText, newSubthought, newThought } from '../../reducers'
import { State } from '../../@types'
import { store as appStore } from '../../store'
import testTimer from '../../test-helpers/testTimer'
import { initialize } from '../../initialize'
import { clear, importText as importTextAction } from '../../action-creators'
import setCursorFirstMatch, { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'

import newThoughtAtFirstMatch from '../../test-helpers/newThoughtAtFirstMatch'
import moveThoughtAtFirstMatch, {
  moveThoughtAtFirstMatchActionCreator,
} from '../../test-helpers/moveThoughtAtFirstMatch'
import checkDataIntegrity from '../../test-helpers/checkDataIntegrity'

const timer = testTimer()

it('move within root', () => {
  const steps = [
    newThought('a'),
    newThought('b'),
    moveThoughtAtFirstMatch({
      from: ['b'],
      to: ['b'],
      newRank: -1,
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - b
  - a`)

  const thoughtB = getThoughtByContext(stateNew, ['b'])!

  // b should exist in the ROOT context
  expect(getContexts(stateNew, 'b')).toMatchObject([thoughtB.id])
  expect(thoughtB.parentId).toBe(HOME_TOKEN)
})

it('persist id on move', () => {
  const steps1 = [newThought('a'), newSubthought('a1'), newSubthought('a2')]

  const stateNew1 = reducerFlow(steps1)(initialState())

  const thoughtA2 = getThoughtByContext(stateNew1, ['a', 'a1', 'a2'])!

  expect(getLexeme(stateNew1, 'a2')!.contexts).toEqual([thoughtA2.id])

  const steps2 = [
    moveThoughtAtFirstMatch({
      from: ['a', 'a1'],
      to: ['a1'],
      newRank: 1,
    }),
  ]

  const stateNew2 = reducerFlow(steps2)(stateNew1)

  const thoughtA2New = getThoughtByContext(stateNew2, ['a1', 'a2'])!
  expect(getLexeme(stateNew2, 'a2')!.contexts).toEqual([thoughtA2New.id])

  expect(thoughtA2New.id).toEqual(thoughtA2!.id)
})

it('move within context (rank only)', () => {
  const steps = [
    newThought('a'),
    newSubthought('a1'),
    newThought('a2'),
    moveThoughtAtFirstMatch({
      from: ['a', 'a2'],
      to: ['a', 'a2'],
      newRank: -1,
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - a2
    - a1`)

  const thoughtA = getThoughtByContext(stateNew, ['a'])!
  const thoughtA2 = getThoughtByContext(stateNew, ['a', 'a2'])!

  expect(thoughtA2.parentId).toBe(thoughtA.id)

  expect(getContexts(stateNew, 'a2')).toMatchObject([thoughtA2.id])
})

it('move across contexts', () => {
  const steps = [
    newThought('a'),
    newSubthought('a1'),
    newThoughtAtFirstMatch({
      value: 'b',
      at: ['a'],
    }),
    newSubthought('b1'),
    moveThoughtAtFirstMatch({
      from: ['b', 'b1'],
      to: ['a', 'b1'],
      newRank: 1,
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

  const thoughtA = getThoughtByContext(stateNew, ['a'])!
  const thoughtB1 = getThoughtByContext(stateNew, ['a', 'b1'])!

  // b1 should exist in context a
  expect(thoughtB1!.parentId).toBe(thoughtA.id)

  expect(getContexts(stateNew, 'b1')).toMatchObject([thoughtB1.id])
})

it('move descendants', () => {
  const steps = [
    newThought('a'),
    newSubthought('a1'),
    newSubthought('a1.1'),
    newThoughtAtFirstMatch({
      value: 'b',
      at: ['a'],
    }),
    newSubthought('b1'),
    newSubthought('b1.1'),
    moveThoughtAtFirstMatch({
      from: ['b'],
      to: ['b'],
      newRank: -1,
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

  const thoughtB = getThoughtByContext(stateNew, ['b'])
  const thoughtB1 = getThoughtByContext(stateNew, ['b', 'b1'])
  const thoughtB11 = getThoughtByContext(stateNew, ['b', 'b1', 'b1.1'])

  expect(thoughtB).not.toBeNull()
  expect(thoughtB1).not.toBeNull()
  expect(thoughtB11).not.toBeNull()

  // on desendent only the moved thought parentId may change, all its descendants will have same back link to their parents.
  expect(thoughtB1!.parentId).toBe(thoughtB!.id)
  expect(thoughtB11!.parentId).toBe(thoughtB1!.id)

  // Checking if the lexeme has correct reference to the thought after move.
  expect(getContexts(stateNew, 'b')).toMatchObject([thoughtB?.id])

  expect(getContexts(stateNew, 'b1')).toMatchObject([thoughtB1?.id])
  expect(getContexts(stateNew, 'b1.1')).toMatchObject([thoughtB11!.id])
})

it('moving cursor thought should update cursor', () => {
  const steps = [
    newThought('a'),
    newSubthought('a1'),
    newThought('a2'),
    moveThoughtAtFirstMatch({
      from: ['a', 'a2'],
      to: ['a', 'a2'],
      newRank: -1,
    }),
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(childIdsToThoughts(stateNew, stateNew.cursor!)).toMatchObject([
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
    moveThoughtAtFirstMatch({
      from: ['b'],
      to: ['b'],
      newRank: -1,
    }),
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  const thoughts = childIdsToThoughts(stateNew, stateNew.cursor!)

  expect(thoughts).toMatchObject([
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
    setCursorFirstMatch(['a']),
    moveThoughtAtFirstMatch({
      from: ['b'],
      to: ['b'],
      newRank: -1,
    }),
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(childIdsToThoughts(stateNew, stateNew.cursor!)).toMatchObject([{ value: 'a', rank: 0 }])
})

it('move root thought into another root thought', () => {
  const text = `
  - x
  - a
    - b
     - c`

  const steps = [
    importText({ text }),
    moveThoughtAtFirstMatch({
      from: ['a'],
      to: ['x', 'a'],
      newRank: -1,
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

  const thoughtX = getThoughtByContext(stateNew, ['x'])!
  const thoughtA = getThoughtByContext(stateNew, ['x', 'a'])!
  const thoughtB = getThoughtByContext(stateNew, ['x', 'a', 'b'])!
  const thoughtC = getThoughtByContext(stateNew, ['x', 'a', 'b', 'c'])!

  expect(getContexts(stateNew, 'a')).toMatchObject([thoughtA.id])
  expect(getContexts(stateNew, 'b')).toMatchObject([thoughtB!.id])
  expect(getContexts(stateNew, 'c')).toMatchObject([thoughtC!.id])

  expect(thoughtX.parentId).toBe(HOME_TOKEN)
  expect(thoughtA.parentId).toBe(thoughtX.id)
  expect(thoughtB.parentId).toBe(thoughtA.id)
  expect(thoughtC.parentId).toBe(thoughtB.id)
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
    moveThoughtAtFirstMatch({
      from: ['a', 'b'],
      to: ['b'],
      newRank: 1,
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

  const thoughtB = getThoughtByContext(stateNew, ['b'])!
  const thoughtC = getThoughtByContext(stateNew, ['b', 'c'])!
  const thoughtD = getThoughtByContext(stateNew, ['b', 'd'])!

  expect(thoughtC.parentId).toBe(thoughtB.id)
  expect(thoughtD.parentId).toBe(thoughtB.id)

  expect(getContexts(stateNew, 'b')).toMatchObject([thoughtB.id])
  expect(getContexts(stateNew, 'c')).toMatchObject([thoughtC.id])
  expect(getContexts(stateNew, 'd')).toMatchObject([thoughtD.id])
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
    moveThoughtAtFirstMatch({
      from: ['m'],
      to: ['a', 'm'],
      newRank: 0,
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

  const thoughtM = getThoughtByContext(stateNew, ['a', 'm'])!
  const thoughtA = getThoughtByContext(stateNew, ['a'])!

  // use destinate rank of duplicate thoughts
  expect(getAllChildren(stateNew, ['a'])).toMatchObject([thoughtM.id])

  expect(thoughtM.parentId).toBe(thoughtA.id)

  // merged thought should only exist in destination context
  expect(getContexts(stateNew, 'm')).toMatchObject([thoughtM.id])
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
    moveThoughtAtFirstMatch({
      from: ['m'],
      to: ['a', 'm'],
      newRank: 0,
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

  const thoughtM = getThoughtByContext(stateNew, ['a', 'm'])

  // use destinate rank of duplicate thoughts
  expect(getAllChildren(stateNew, ['a'])).toMatchObject([thoughtM?.id])

  // merged thought should only exist in destination context
  expect(getContexts(stateNew, 'm')).toMatchObject([thoughtM?.id])
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
    moveThoughtAtFirstMatch({
      from: ['b'],
      to: ['a', 'b'],
      newRank: 0,
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  // thoughtIndex
  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
      - x
      - y
        - x`)

  const thoughtXUnderB = getThoughtByContext(stateNew, ['a', 'b', 'x'])!
  const thoughtXUnderY = getThoughtByContext(stateNew, ['a', 'b', 'y', 'x'])!

  // x should have contexts a/b and a/b/y
  expect(getContexts(stateNew, 'x')).toMatchObject([thoughtXUnderB.id, thoughtXUnderY.id])
})

it('move with hash matched descendant', () => {
  const text = `
  - a
  - b
    - =note
      - note`

  const steps = [
    importText({ text }),
    moveThoughtAtFirstMatch({
      from: ['b'],
      to: ['a', 'b'],
      newRank: 0,
    }),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
      - =note
        - note`)

  const thoughtNoteFirst = getThoughtByContext(stateNew, ['a', 'b', '=note'])!
  const thoughtNoteSecond = getThoughtByContext(stateNew, ['a', 'b', '=note', 'note'])!

  expect(thoughtNoteSecond?.parentId).toBe(thoughtNoteFirst.id)

  expect(getContexts(stateNew, 'note')).toMatchObject([thoughtNoteFirst.id, thoughtNoteSecond.id])
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
    moveThoughtAtFirstMatch({
      from: ['c', 'a'],
      to: ['a'],
      newRank: 0,
    }),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
  - c`)

  const thoughtA = getThoughtByContext(stateNew, ['a'])!
  const thoughtB = getThoughtByContext(stateNew, ['a', 'b'])!

  expect(thoughtB.parentId).toBe(thoughtA.id)
  expect(getContexts(stateNew, 'b')).toMatchObject([thoughtB.id])
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
    moveThoughtAtFirstMatch({
      from: ['p', 'a'],
      to: ['a'],
      newRank: 0,
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

  const thoughtA = getThoughtByContext(stateNew, ['a'])!
  const thoughtB = getThoughtByContext(stateNew, ['a', 'b'])!

  expect(thoughtB.parentId).toBe(thoughtA.id)
  // b should only be in context ['a']
  expect(getContexts(stateNew, 'b')).toMatchObject([thoughtB.id])

  // context ['p', 'a'] should not have any garbage children
  expect(getChildrenRanked(stateNew, ['p', 'a'])).toHaveLength(0)

  const thoughtC = getThoughtByContext(stateNew, ['a', 'b', 'c'])!

  expect(thoughtC.parentId).toBe(thoughtB.id)
  // c should only be in context ['a', 'b']
  expect(getContexts(stateNew, 'c')).toMatchObject([thoughtC.id])

  // context ['p', 'a', 'b'] should not have any garbage children
  expect(getChildrenRanked(stateNew, ['p', 'a', 'b'])).toHaveLength(0)
})

it('data integrity test', () => {
  const text = `
  - k
    - a
      - b
        - c
  - m`
  const steps = [
    importText({ text }),
    moveThoughtAtFirstMatch({
      from: ['k', 'a'],
      to: ['m', 'a'],
      newRank: 0,
    }),
  ]
  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const { missingLexemeValues, missingParentIds } = checkDataIntegrity(stateNew)

  expect(missingLexemeValues).toHaveLength(0)
  expect(missingParentIds).toHaveLength(0)
})

it('consistent rank between lexemeIndex and thoughtIndex on duplicate merge', () => {
  const text = `
  - a
    - b
  - b`

  const steps = [
    importText({ text }),
    (newState: State) =>
      moveThoughtAtFirstMatch(newState, {
        from: ['a', 'b'],
        to: ['b'],
        // Note: Here new rank will be 0.5 because it's calculated between a (0) and b (1)
        newRank: getRankAfter(newState, rankThoughtsFirstMatch(newState, ['a'])!) as number,
      }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const contextsOfB = getContexts(stateNew, 'b')

  expect(contextsOfB).toHaveLength(1)
})

it('pending destination should be merged correctly (fetch pending before move)', async () => {
  timer.useFakeTimer()
  initialize()
  await timer.runAllAsync()

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

  appStore.dispatch(importTextAction({ text }))
  await timer.runAllAsync()

  timer.useFakeTimer()

  // clear and call initialize again to reload from local db (simulating page refresh)
  appStore.dispatch(clear())
  await timer.runAllAsync()

  initialize()

  await timer.runAllAsync()

  appStore.dispatch([setCursorFirstMatchActionCreator(['a'])])

  // wait for pullBeforeMove middleware to execute
  await timer.runAllAsync()

  timer.useFakeTimer()

  appStore.dispatch([
    moveThoughtAtFirstMatchActionCreator({
      from: ['a', 'b'],
      to: ['d', 'b'],
      newRank: 1,
    }),
  ])

  await timer.runAllAsync()

  timer.useRealTimer()

  const exported = exportContext(appStore.getState(), [HOME_TOKEN], 'text/plain')

  const expected = `- ${HOME_TOKEN}
  - a
  - d
    - b
      - c
        - three
        - four
        - one
        - two`

  expect(exported).toBe(expected)
})

it('only fetch the descendants up to the possible conflicting path', async () => {
  timer.useFakeTimer()
  initialize()
  await timer.runAllAsync()

  const text = `
  - a
    - b
      - c
        - 1
        - 2
  - p
    - b
      - c
        - 3
          - 3.1
          - 3.2
            - 3.2.1
        - 4
  - z`

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
    moveThoughtAtFirstMatchActionCreator({
      from: ['a', 'b'],
      to: ['p', 'b'],
      newRank: 1,
    }),
  ])

  await timer.runAllAsync()

  timer.useRealTimer()

  expect(isPending(appStore.getState(), ['p', 'b'])).toEqual(false)
  expect(isPending(appStore.getState(), ['p', 'b', 'c', '3'])).toEqual(true)
})

it('update cursor if duplicate thought with cursor is deleted', () => {
  const text = `
  - a
    - b
  - b`

  const steps = [
    importText({ text }),
    setCursorFirstMatch(['b']),
    moveThoughtAtFirstMatch({
      from: ['b'],
      to: ['a', 'b'],
      newRank: 0,
    }),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b`)

  expect(stateNew.cursor).toBeTruthy()
  const cursorThought = getThoughtByPath(stateNew, stateNew.cursor!)
  expect(cursorThought).toBeTruthy()
})
