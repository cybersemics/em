import { HOME_PATH, HOME_TOKEN } from '../../constants'
import { contextToThoughtId, initialState, reducerFlow } from '../../util'
import { exportContext, getContexts, getLexeme, contextToThought, parentOfThought } from '../../selectors'
import { newThought, importText } from '../../reducers'
import { getAllChildrenAsThoughts } from '../../selectors/getChildren'
import checkDataIntegrity from '../../test-helpers/checkDataIntegrity'
import editThoughtAtFirstMatch from '../../test-helpers/editThoughtAtFirstMatch'
import getAllChildrenByContext from '../../test-helpers/getAllChildrenByContext'
import matchChildIdsWithThoughts from '../../test-helpers/matchPathWithThoughts'
import newThoughtAtFirstMatch from '../../test-helpers/newThoughtAtFirstMatch'
import setCursorFirstMatch from '../../test-helpers/setCursorFirstMatch'

it('edit a thought', () => {
  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'b' }),
    setCursorFirstMatch(['a']),
    editThoughtAtFirstMatch({
      newValue: 'aa',
      oldValue: 'a',
      at: ['a'],
    }),
  ]
  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - aa
  - b`)

  const thought = contextToThought(stateNew, ['aa'])

  // Note: Lexeme now stores refrence to the actual thought instead of the context of the thought. A thought's parent can directly backlinked from Parent.parentId
  // aa should exist in ROOT context

  expect(thought).toBeDefined()
  expect(thought!.parentId).toBe(HOME_TOKEN)

  expect(getContexts(stateNew, 'aa')).toMatchObject([thought!.id])

  expect(getAllChildrenAsThoughts(stateNew, [HOME_TOKEN])).toMatchObject([
    {
      id: contextToThoughtId(stateNew, ['b'])!,
      value: 'b',
      parentId: HOME_TOKEN,
      rank: 1,
    },
    {
      id: contextToThoughtId(stateNew, ['aa'])!,
      value: 'aa',
      parentId: HOME_TOKEN,
      rank: 0,
    },
  ])

  // cursor should be at /aa
  expect(stateNew.cursor).toMatchObject([contextToThoughtId(stateNew, ['aa'])])
})

it('edit a descendant', () => {
  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'a1', insertNewSubthought: true }),
    newThoughtAtFirstMatch({
      value: 'b',
      at: ['a'],
    }),
    editThoughtAtFirstMatch({
      newValue: 'aa1',
      oldValue: 'a1',
      at: ['a', 'a1'],
    }),
  ]
  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - aa1
  - b`)

  const aId = contextToThoughtId(stateNew, ['a'])!
  const aa1Id = contextToThoughtId(stateNew, ['a', 'aa1'])!

  // aa1 should exist in context a
  expect(getContexts(stateNew, 'aa1')).toMatchObject([aa1Id])

  const parent = parentOfThought(stateNew, aa1Id)
  expect(parent?.id).toBe(aId)

  expect(getAllChildrenByContext(stateNew, ['a'])).toMatchObject([aa1Id])
})

it('edit a thought with descendants', () => {
  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'a1', insertNewSubthought: true }),
    newThought({ value: 'a2' }),
    editThoughtAtFirstMatch({
      newValue: 'aa',
      oldValue: 'a',
      at: ['a'],
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - aa
    - a1
    - a2`)

  const thought = contextToThought(stateNew, ['aa'])
  const thoughtA1 = contextToThought(stateNew, ['aa', 'a1'])
  const thoughtA2 = contextToThought(stateNew, ['aa', 'a2'])

  // Note: Lexeme now stores refrence to the actual thought instead of the context of the thought. A thought's parent can directly backlinked from Parent.parentId
  // aa should exist in ROOT context

  expect(thought).toBeDefined()
  expect(thought!.parentId).toBe(HOME_TOKEN)

  // aa should exist in ROOT context
  expect(getContexts(stateNew, 'aa')).toMatchObject([thought!.id])

  expect(thought?.parentId).toBe(HOME_TOKEN)

  expect(getAllChildrenAsThoughts(stateNew, ['aa'])).toMatchObject([
    {
      value: 'a1',
      rank: 0,
      id: thoughtA1?.id,
    },
    {
      value: 'a2',
      rank: 1,
      id: thoughtA2?.id,
    },
  ])
})

it('edit a thought existing in mutliple contexts', () => {
  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'ab', insertNewSubthought: true }),
    newThoughtAtFirstMatch({
      value: 'b',
      at: ['a'],
    }),
    newThought({ value: 'ab', insertNewSubthought: true }),
    editThoughtAtFirstMatch({
      newValue: 'abc',
      oldValue: 'ab',
      at: ['a', 'ab'],
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - abc
  - b
    - ab`)

  const thoughtABC = contextToThought(stateNew, ['a', 'abc'])!

  // Note: Lexeme now stores refrence to the actual thought instead of the context of the thought. A thought's parent can directly backlinked from Parent.parentId
  // aa should exist in ROOT context

  expect(thoughtABC).not.toBeNull()
  expect(thoughtABC!.parentId).toBe(contextToThoughtId(stateNew, ['a']))

  // abc should exist in context a
  expect(getContexts(stateNew, 'abc')).toMatchObject([thoughtABC.id])

  expect(getAllChildrenAsThoughts(stateNew, ['a'])).toMatchObject([
    {
      value: 'abc',
      rank: 0,
      id: thoughtABC.id,
    },
  ])
})

it('edit a thought that exists in another context', () => {
  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'ab', insertNewSubthought: true }),
    newThoughtAtFirstMatch({
      value: 'b',
      at: ['a'],
    }),
    newThought({ value: 'a', insertNewSubthought: true }),
    editThoughtAtFirstMatch({
      newValue: 'ab',
      oldValue: 'a',
      at: ['b', 'a'],
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - ab
  - b
    - ab`)

  const thoughtInContextA = contextToThought(stateNew, ['a', 'ab'])!
  const thoughtInContextB = contextToThought(stateNew, ['b', 'ab'])!

  expect(thoughtInContextA).toBeTruthy()
  expect(thoughtInContextB).toBeTruthy()

  // ab should exist in both contexts a and b
  expect(getContexts(stateNew, 'ab')).toMatchObject([thoughtInContextA!.id, thoughtInContextB!.id])

  expect(getAllChildrenAsThoughts(stateNew, ['a'])).toMatchObject([
    {
      value: 'ab',
      rank: 0,
      id: thoughtInContextA.id,
    },
  ])

  expect(getAllChildrenAsThoughts(stateNew, ['b'])).toMatchObject([{ value: 'ab', rank: 0, id: thoughtInContextB.id }])
})

it('edit a child with the same value as its parent', () => {
  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'a', insertNewSubthought: true }),
    editThoughtAtFirstMatch({
      newValue: 'ab',
      oldValue: 'a',
      at: ['a', 'a'],
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - ab`)

  const thoughtInContextA = contextToThought(stateNew, ['a', 'ab'])!
  const thoughtA = contextToThought(stateNew, ['a'])!

  expect(thoughtInContextA).toBeTruthy()
  // ab should exist in context a
  expect(getContexts(stateNew, 'ab')).toMatchObject([thoughtInContextA!.id])

  expect(thoughtInContextA?.parentId).toBe(thoughtA.id)
  expect(getAllChildrenAsThoughts(stateNew, ['a'])).toMatchObject([{ value: 'ab', rank: 0, id: thoughtInContextA.id }])

  // cursor should be /a/ab
  matchChildIdsWithThoughts(stateNew, stateNew.cursor!, [
    {
      value: 'a',
    },
    {
      value: 'ab',
    },
  ])
})

it('do not duplicate children when new and old context are same', () => {
  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'b', insertNewSubthought: true }),
    editThoughtAtFirstMatch({
      newValue: 'as',
      oldValue: 'a',
      at: ['a'],
    }),
    editThoughtAtFirstMatch({
      newValue: 'a',
      oldValue: 'as',
      at: ['as'],
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b`)
})

// Issue: https://github.com/cybersemics/em/issues/1095
it('data integrity test', () => {
  const text = `
    - a
      - b
        - d
      - d`

  const steps = [
    importText({
      text,
    }),
    setCursorFirstMatch(['a']),
    editThoughtAtFirstMatch({
      at: ['a'],
      oldValue: 'a',
      newValue: 'azkaban',
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const { missingLexemeValues, missingParentIds } = checkDataIntegrity(stateNew)

  expect(missingLexemeValues).toHaveLength(0)
  expect(missingParentIds).toHaveLength(0)
})

// Issue: https://github.com/cybersemics/em/issues/1144
it('data integrity test after editing a parent with multiple descendants with same value and depth', () => {
  const text = `
  - ${' '}
    - a
      - m
    - b
      - m`

  const steps = [
    importText({
      text,
    }),
    setCursorFirstMatch(['']),
    editThoughtAtFirstMatch({
      at: [''],
      oldValue: '',
      newValue: 'x',
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const { missingLexemeValues, missingParentIds } = checkDataIntegrity(stateNew)

  expect(missingLexemeValues).toHaveLength(0)
  expect(missingParentIds).toHaveLength(0)
})

describe('changing thought with duplicate descendent', () => {
  it('adding', () => {
    const steps = [
      importText({
        path: HOME_PATH,
        text: `
      - a
        - b
          - ac`,
      }),
      editThoughtAtFirstMatch({
        newValue: 'ac',
        oldValue: 'a',
        at: ['a'],
      }),
    ]

    // run steps through reducer flow and export as plaintext for readable test
    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - ac
    - b
      - ac`)

    const lexeme = getLexeme(stateNew, 'ac')

    // Lexeme should be properly updated
    expect(lexeme?.contexts).toHaveLength(2)
  })

  it('removing', () => {
    const steps = [
      importText({
        path: HOME_PATH,
        text: `
      - a
        - b
          - a`,
      }),
      editThoughtAtFirstMatch({
        newValue: 'ac',
        oldValue: 'a',
        at: ['a'],
      }),
    ]

    // run steps through reducer flow and export as plaintext for readable test
    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - ac
    - b
      - a`)

    const lexeme = getLexeme(stateNew, 'a')
    // Lexeme should be properly updated
    expect(lexeme?.contexts).toHaveLength(1)
  })
})
