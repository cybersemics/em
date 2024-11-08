import State from '../../@types/State'
import importText from '../../actions/importText'
import newSubthought from '../../actions/newSubthought'
import newThought from '../../actions/newThought'
import { HOME_TOKEN } from '../../constants'
import childIdsToThoughts from '../../selectors/childIdsToThoughts'
import contextToPath from '../../selectors/contextToPath'
import exportContext from '../../selectors/exportContext'
import getContexts from '../../selectors/getContexts'
import getLexeme from '../../selectors/getLexeme'
import getRankAfter from '../../selectors/getRankAfter'
import pathToThought from '../../selectors/pathToThought'
import checkDataIntegrity from '../../test-helpers/checkDataIntegrity'
import contextToThought from '../../test-helpers/contextToThought'
import getAllChildrenByContext from '../../test-helpers/getAllChildrenByContext'
import getChildrenRankedByContext from '../../test-helpers/getChildrenRankedByContext'
import moveThoughtAtFirstMatch from '../../test-helpers/moveThoughtAtFirstMatch'
import newThoughtAtFirstMatch from '../../test-helpers/newThoughtAtFirstMatch'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'

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

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - b
  - a`)

  const thoughtB = contextToThought(stateNew, ['b'])!

  // b should exist in the ROOT context
  expect(getContexts(stateNew, 'b')).toMatchObject([thoughtB.id])
  expect(thoughtB.parentId).toBe(HOME_TOKEN)
})

it('persist id on move', () => {
  const steps1 = [newThought('a'), newSubthought('a1'), newSubthought('a2')]

  const stateNew1 = reducerFlow(steps1)(initialState())

  const thoughtA2 = contextToThought(stateNew1, ['a', 'a1', 'a2'])!

  expect(getLexeme(stateNew1, 'a2')!.contexts).toEqual([thoughtA2.id])

  const steps2 = [
    moveThoughtAtFirstMatch({
      from: ['a', 'a1'],
      to: ['a1'],
      newRank: 1,
    }),
  ]

  const stateNew2 = reducerFlow(steps2)(stateNew1)

  const thoughtA2New = contextToThought(stateNew2, ['a1', 'a2'])!
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

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - a2
    - a1`)

  const thoughtA = contextToThought(stateNew, ['a'])!
  const thoughtA2 = contextToThought(stateNew, ['a', 'a2'])!

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

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - a1
    - b1
  - b`)

  const thoughtA = contextToThought(stateNew, ['a'])!
  const thoughtB1 = contextToThought(stateNew, ['a', 'b1'])!

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

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - b
    - b1
      - b1.1
  - a
    - a1
      - a1.1`)

  const thoughtB = contextToThought(stateNew, ['b'])
  const thoughtB1 = contextToThought(stateNew, ['b', 'b1'])
  const thoughtB11 = contextToThought(stateNew, ['b', 'b1', 'b1.1'])

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
    setCursor(['a']),
    moveThoughtAtFirstMatch({
      from: ['b'],
      to: ['b'],
      newRank: -1,
    }),
  ]

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

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - x
    - a
      - b
        - c`)

  const thoughtX = contextToThought(stateNew, ['x'])!
  const thoughtA = contextToThought(stateNew, ['x', 'a'])!
  const thoughtB = contextToThought(stateNew, ['x', 'a', 'b'])!
  const thoughtC = contextToThought(stateNew, ['x', 'a', 'b', 'c'])!

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

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
  - b
    - c
    - d`)

  const thoughtB = contextToThought(stateNew, ['b'])!
  const thoughtC = contextToThought(stateNew, ['b', 'c'])!
  const thoughtD = contextToThought(stateNew, ['b', 'd'])!

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

  const stateNew = reducerFlow(steps)(initialState())

  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - m
      - x
      - y`)

  const thoughtM = contextToThought(stateNew, ['a', 'm'])!
  const thoughtA = contextToThought(stateNew, ['a'])!

  // use destinate rank of duplicate thoughts
  expect(getAllChildrenByContext(stateNew, ['a'])).toMatchObject([thoughtM.id])

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

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - m
      - x
      - y`)

  const thoughtM = contextToThought(stateNew, ['a', 'm'])

  // use destinate rank of duplicate thoughts
  expect(getAllChildrenByContext(stateNew, ['a'])).toMatchObject([thoughtM?.id])

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

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  // thoughtIndex
  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
      - x
      - y
        - x`)

  const thoughtXUnderB = contextToThought(stateNew, ['a', 'b', 'x'])!
  const thoughtXUnderY = contextToThought(stateNew, ['a', 'b', 'y', 'x'])!

  // x should have contexts a/b and a/b/y
  expect(getContexts(stateNew, 'x')).toMatchObject([thoughtXUnderB.id, thoughtXUnderY.id])
})

it('move with hash matched descendant', () => {
  const text = `
  - a
  - b
    - Note
      - notes`

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
      - Note
        - notes`)

  const thoughtNoteFirst = contextToThought(stateNew, ['a', 'b', 'Note'])!
  const thoughtNoteSecond = contextToThought(stateNew, ['a', 'b', 'Note', 'notes'])!

  expect(thoughtNoteSecond?.parentId).toBe(thoughtNoteFirst.id)

  expect(getContexts(stateNew, 'notes')).toMatchObject([thoughtNoteFirst.id, thoughtNoteSecond.id])
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

  const thoughtA = contextToThought(stateNew, ['a'])!
  const thoughtB = contextToThought(stateNew, ['a', 'b'])!

  expect(thoughtB.parentId).toBe(thoughtA.id)
  expect(getContexts(stateNew, 'b')).toMatchObject([thoughtB.id])
})

it('merge thought with duplicate parent', () => {
  const text = `
  - a
    - b
      - b
        - c
  `

  const steps = [
    importText({ text }),
    moveThoughtAtFirstMatch({
      from: ['a', 'b', 'b'],
      to: ['a', 'b'],
      newRank: 1,
    }),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
      - c`)

  const thoughtA = contextToThought(stateNew, ['a'])!
  const thoughtB = contextToThought(stateNew, ['a', 'b'])!
  const thoughtC = contextToThought(stateNew, ['a', 'b', 'c'])!

  expect(thoughtB.parentId).toBe(thoughtA.id)
  expect(thoughtC.parentId).toBe(thoughtB.id)
  expect(getContexts(stateNew, 'b')).toMatchObject([thoughtB.id])
  expect(getContexts(stateNew, 'c')).toMatchObject([thoughtC.id])
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

  const thoughtA = contextToThought(stateNew, ['a'])!
  const thoughtB = contextToThought(stateNew, ['a', 'b'])!

  expect(thoughtB.parentId).toBe(thoughtA.id)
  // b should only be in context ['a']
  expect(getContexts(stateNew, 'b')).toMatchObject([thoughtB.id])

  // context ['p', 'a'] should not have any garbage children
  expect(getChildrenRankedByContext(stateNew, ['p', 'a'])).toHaveLength(0)

  const thoughtC = contextToThought(stateNew, ['a', 'b', 'c'])!

  expect(thoughtC.parentId).toBe(thoughtB.id)
  // c should only be in context ['a', 'b']
  expect(getContexts(stateNew, 'c')).toMatchObject([thoughtC.id])

  // context ['p', 'a', 'b'] should not have any garbage children
  expect(getChildrenRankedByContext(stateNew, ['p', 'a', 'b'])).toHaveLength(0)
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
        newRank: getRankAfter(newState, contextToPath(newState, ['a'])!) as number,
      }),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const contextsOfB = getContexts(stateNew, 'b')

  expect(contextsOfB).toHaveLength(1)
})

it('update cursor if duplicate thought with cursor is deleted', () => {
  const text = `
  - a
    - b
  - b`

  const steps = [
    importText({ text }),
    setCursor(['b']),
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
  const cursorThought = pathToThought(stateNew, stateNew.cursor!)
  expect(cursorThought).toBeTruthy()
})

it('re-expand after moving across contexts', () => {
  const text = `
  - a
    - b
      - c`

  const steps = [
    importText({ text }),
    setCursor(['a', 'b']),
    moveThoughtAtFirstMatch({
      from: ['a', 'b'],
      to: ['b'],
      newRank: 1,
    }),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
  - b
    - c`)

  // b should be expanded even though it has a new Path
  const thoughtB = contextToThought(stateNew, ['b'])!
  expect(stateNew.expanded[thoughtB.id]).toBeTruthy()
})

it('move thought to the beginning of a sorted context', () => {
  const text = `
    - =sort
      - Alphabetical
    - a
    - c
      - =pin
  `

  const steps = [
    importText({ text }),
    setCursor(['c', '=pin']),
    moveThoughtAtFirstMatch({
      from: ['c', '=pin'],
      to: ['=pin'],
      newRank: 999,
    }),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - =pin
  - =sort
    - Alphabetical
  - a
  - c`)

  // newRank should be ignored when moving into a sorted context
  expect(contextToThought(stateNew, ['=pin'])?.rank).not.toEqual(999)
})

it('move thought to the middle of a sorted context', () => {
  const text = `
    - =sort
      - Alphabetical
    - a
    - c
      - b
  `

  const steps = [
    importText({ text }),
    setCursor(['c', 'b']),
    moveThoughtAtFirstMatch({
      from: ['c', 'b'],
      to: ['b'],
      newRank: 999,
    }),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - =sort
    - Alphabetical
  - a
  - b
  - c`)

  // newRank should be ignored when moving into a sorted context
  expect(contextToThought(stateNew, ['b'])?.rank).not.toEqual(999)
})

it('move thought to the end of a sorted context', () => {
  const text = `
    - =sort
      - Alphabetical
    - a
    - c
      - d
  `

  const steps = [
    importText({ text }),
    setCursor(['c', 'd']),
    moveThoughtAtFirstMatch({
      from: ['c', 'd'],
      to: ['d'],
      newRank: 999,
    }),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - =sort
    - Alphabetical
  - a
  - c
  - d`)

  // newRank should be ignored when moving into a sorted context
  expect(contextToThought(stateNew, ['d'])?.rank).not.toEqual(999)
})

it('do not re-rank siblings in sorted context', () => {
  const text = `
    - =sort
      - Alphabetical
    - a
    - c
      - b
  `

  const steps = [importText({ text }), setCursor(['c', 'b'])]
  const state = reducerFlow(steps)(initialState())
  const thoughtA1 = contextToThought(state, ['a'])!
  const thoughtC1 = contextToThought(state, ['c'])!

  const stateNew = moveThoughtAtFirstMatch({
    from: ['c', 'b'],
    to: ['b'],
    newRank: 999,
  })(state)
  const thoughtA2 = contextToThought(stateNew, ['a'])!
  const thoughtC2 = contextToThought(stateNew, ['c'])!

  expect(thoughtA2).toHaveProperty('rank', thoughtA1!.rank)
  expect(thoughtC2).toHaveProperty('rank', thoughtC1!.rank)
})

it('disable sort on move within context', () => {
  const text = `
    - =sort
      - Alphabetical
    - a
    - b
    - c
  `

  const steps = [
    importText({ text }),
    moveThoughtAtFirstMatch({
      from: ['a'],
      to: ['a'],
      newRank: 999,
    }),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - b
  - c
  - a`)
})
