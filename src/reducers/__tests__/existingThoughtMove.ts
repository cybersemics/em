import { RANKED_ROOT, ROOT_TOKEN } from '../../constants'
import { equalArrays, initialState, reducerFlow } from '../../util'
import { exportContext, getContexts, getThought, getAllChildren } from '../../selectors'
import { existingThoughtMove, importText, newSubthought, newThought, setCursor } from '../../reducers'

it('move within root', () => {

  const steps = [
    newThought('a'),
    newThought('b'),
    existingThoughtMove({
      oldPath: [{ value: 'b', rank: 1 }],
      newPath: [{ value: 'b', rank: -1 }],
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - b
  - a`)

  // b should exist in the ROOT context
  expect(getContexts(stateNew, 'b'))
    .toMatchObject([{
      context: [ROOT_TOKEN],
      rank: -1,
    }])

})

it('persist id on move', () => {

  const steps1 = [
    newThought('a'),
    newSubthought('a1'),
    newSubthought('a2'),
  ]

  const stateNew1 = reducerFlow(steps1)(initialState())
  const oldExactThought = getThought(stateNew1, 'a2')!.contexts.find(thought => equalArrays(thought.context, ['a', 'a1']) && thought.rank === 0)
  const oldId = oldExactThought?.id

  const steps2 = [
    existingThoughtMove({
      oldPath: [{ value: 'a', rank: 0 }, { value: 'a1', rank: 0 }],
      newPath: [{ value: 'a1', rank: 1 }],
    }),
  ]

  const stateNew2 = reducerFlow(steps2)(stateNew1)
  const newExactThought = getThought(stateNew2, 'a2')!.contexts.find(thought => equalArrays(thought.context, ['a1']) && thought.rank === 0)
  const newId = newExactThought?.id

  expect(oldId).toEqual(newId)
})

it('move within context', () => {

  const steps = [
    newThought('a'),
    newSubthought('a1'),
    newThought('a2'),
    existingThoughtMove({
      oldPath: [{ value: 'a', rank: 0 }, { value: 'a2', rank: 1 }],
      newPath: [{ value: 'a', rank: 0 }, { value: 'a2', rank: -1 }],
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - a2
    - a1`)

  // context of a2 should remain unchanged
  expect(getContexts(stateNew, 'a2'))
    .toMatchObject([{
      context: ['a'],
      rank: -1,
    }])

})

it('move across contexts', () => {

  const steps = [
    newThought('a'),
    newSubthought('a1'),
    newThought({ value: 'b', at: [{ value: 'a', rank: 0 }] }),
    newSubthought('b1'),
    existingThoughtMove({
      oldPath: [{ value: 'b', rank: 0 }, { value: 'b1', rank: 0 }],
      newPath: [{ value: 'a', rank: 0 }, { value: 'b1', rank: 1 }],
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - a1
    - b1
  - b`)

  // b1 should exist in context a
  expect(getContexts(stateNew, 'b1'))
    .toMatchObject([{
      context: ['a'],
      rank: 1,
    }])

})

it('move descendants', () => {

  const steps = [
    newThought('a'),
    newSubthought('a1'),
    newSubthought('a1.1'),
    newThought({ value: 'b', at: [{ value: 'a', rank: 0 }] }),
    newSubthought('b1'),
    newSubthought('b1.1'),
    existingThoughtMove({
      oldPath: [{ value: 'b', rank: 1 }],
      newPath: [{ value: 'b', rank: -1 }],
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - b
    - b1
      - b1.1
  - a
    - a1
      - a1.1`)

  // context of b should remain to be ROOT
  expect(getContexts(stateNew, 'b'))
    .toMatchObject([{
      context: [ROOT_TOKEN],
      rank: -1,
    }])

  // contexts of both the descendants of b should change
  expect(getContexts(stateNew, 'b1'))
    .toMatchObject([{
      context: ['b'],
      rank: 0,
    }])
  expect(getContexts(stateNew, 'b1.1'))
    .toMatchObject([{
      context: ['b', 'b1'],
      rank: 0,
    }])

})

it('moving cursor thought should update cursor', () => {

  const steps = [
    newThought('a'),
    newSubthought('a1'),
    newThought('a2'),
    existingThoughtMove({
      oldPath: [{ value: 'a', rank: 0 }, { value: 'a2', rank: 1 }],
      newPath: [{ value: 'a', rank: 0 }, { value: 'a2', rank: -1 }],
    }),
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }, { value: 'a2', rank: -1 }])

})

it('moving ancestor of cursor should update cursor', () => {

  const steps = [
    newThought('a'),
    newThought('b'),
    newSubthought('b1'),
    newSubthought('b1.1'),
    existingThoughtMove({
      oldPath: [{ value: 'b', rank: 1 }],
      newPath: [{ value: 'b', rank: -1 }],
    }),

  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'b', rank: -1 }, { value: 'b1', rank: 0 }, { value: 'b1.1', rank: 0 }])

})

it('moving unrelated thought should not update cursor', () => {

  const steps = [
    newThought('a'),
    newThought('b'),
    newSubthought('b1'),
    newSubthought('b1.1'),
    setCursor({ path: [{ value: 'a', rank: 0 }] }),
    existingThoughtMove({
      oldPath: [{ value: 'b', rank: 1 }],
      newPath: [{ value: 'b', rank: -1 }],
    }),

  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }])

})

it('move root thought into another root thought', () => {

  const text = `
  - x
  - a
    - b
     - c`

  const steps = [
    importText({ path: RANKED_ROOT, text }),
    existingThoughtMove({
      oldPath: [{ value: 'a', rank: 1 }],
      newPath: [{ value: 'x', rank: 0 }, { value: 'a', rank: 0 }],
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${ROOT_TOKEN}
  - x
    - a
      - b
        - c`)

  expect(getContexts(stateNew, 'a'))
    .toMatchObject([{
      context: ['x'],
      rank: 0,
    }])

  expect(getContexts(stateNew, 'b'))
    .toMatchObject([{
      context: ['x', 'a'],
      rank: 0,
    }])
  expect(getContexts(stateNew, 'c'))
    .toMatchObject([{
      context: ['x', 'a', 'b'],
      rank: 0,
    }])

})

// ensure that siblings of descendants are properly merged into final result
it('move descendants with siblings', () => {

  const text = `
  - a
    - b
     - c
     - d`

  const steps = [
    importText({ path: RANKED_ROOT, text }),
    existingThoughtMove({
      oldPath: [{ value: 'a', rank: 0 }, { value: 'b', rank: 0 }],
      newPath: [{ value: 'b', rank: 1 }],
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
  - b
    - c
    - d`)

  // b should exist in the ROOT context
  expect(getContexts(stateNew, 'b'))
    .toMatchObject([{
      context: [ROOT_TOKEN],
      rank: 1,
    }])

  // context for both the descendants of b should change
  expect(getContexts(stateNew, 'c'))
    .toMatchObject([{
      context: ['b'],
      rank: 0,
    }])
  expect(getContexts(stateNew, 'd'))
    .toMatchObject([{
      context: ['b'],
      rank: 1,
    }])

})

it('merge duplicate with new rank', () => {

  const text = `
  - a
    - m
      - x
  - m
   - y`

  const steps = [
    importText({ path: RANKED_ROOT, text }),
    existingThoughtMove({
      oldPath: [{ value: 'm', rank: 1 }],
      newPath: [{ value: 'a', rank: 0 }, { value: 'm', rank: 0 }],
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - m
      - x
      - y`)

  // use destinate rank of duplicate thoughts
  expect(getAllChildren(stateNew, ['a']))
    .toMatchObject([{ value: 'm', rank: 0 }])

  // merged thought should only exist in destination context
  expect(getContexts(stateNew, 'm'))
    .toMatchObject([{
      context: ['a'],
      rank: 0,
    }])

})

it('merge with duplicate with duplicate rank', () => {

  const text = `
  - a
    - m
      - x
  - m
    - y`

  const steps = [
    importText({ path: RANKED_ROOT, text }),
    existingThoughtMove({
      oldPath: [{ value: 'm', rank: 1 }],
      newPath: [{ value: 'a', rank: 0 }, { value: 'm', rank: 0 }],
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - m
      - x
      - y`)

  // use destinate rank of duplicate thoughts
  expect(getAllChildren(stateNew, ['a']))
    .toMatchObject([{ value: 'm', rank: 0 }])

  // merged thought should only exist in destination context
  expect(getContexts(stateNew, 'm'))
    .toMatchObject([{
      context: ['a'],
      rank: 0,
    }])

})

it('move with duplicate descendant', () => {

  const text = `
  - a
  - b
    - x
    - y
      - x`

  const steps = [
    importText({ path: RANKED_ROOT, text }),
    existingThoughtMove({
      oldPath: [{ value: 'b', rank: 1 }],
      newPath: [{ value: 'a', rank: 0 }, { value: 'b', rank: 0 }],
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plain')

  // contextIndex
  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - b
      - x
      - y
        - x`)

  // x should have contexts a/b and a/b/y
  expect(getContexts(stateNew, 'x'))
    .toMatchObject([
      { context: ['a', 'b'], rank: 0 },
      { context: ['a', 'b', 'y'], rank: 0 }
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
    importText({ path: RANKED_ROOT, text }),
    existingThoughtMove({
      oldPath: [{ value: 'b', rank: 1 }],
      newPath: [{ value: 'a', rank: 0 }, { value: 'b', rank: 0 }],
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plain')

  // contextIndex
  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - b
      - x
      - y
        - x`)

  // x should have contexts a/b and a/b/y
  expect(getContexts(stateNew, 'x'))
    .toMatchObject([
      { context: ['a', 'b'], rank: 0 },
      { context: ['a', 'b', 'y'], rank: 0 }
    ])

})

it('move with hash matched descendant', () => {

  const text = `
  - a
  - b
    - =note
      - note`

  const steps = [
    importText({ path: RANKED_ROOT, text }),
    existingThoughtMove({
      oldPath: [{ value: 'b', rank: 1 }],
      newPath: [{ value: 'a', rank: 0 }, { value: 'b', rank: 0 }],
    }),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - b
      - =note
        - note`)

})
