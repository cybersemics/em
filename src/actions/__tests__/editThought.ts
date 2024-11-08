import importText from '../../actions/importText'
import newSubthought from '../../actions/newSubthought'
import newThought from '../../actions/newThought'
import { HOME_PATH, HOME_TOKEN } from '../../constants'
import childIdsToThoughts from '../../selectors/childIdsToThoughts'
import contextToThoughtId from '../../selectors/contextToThoughtId'
import exportContext from '../../selectors/exportContext'
import getContexts from '../../selectors/getContexts'
import getLexeme from '../../selectors/getLexeme'
import parentOfThought from '../../selectors/parentOfThought'
import checkDataIntegrity from '../../test-helpers/checkDataIntegrity'
import contextToThought from '../../test-helpers/contextToThought'
import editThought from '../../test-helpers/editThoughtByContext'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import getAllChildrenAsThoughtsByContext from '../../test-helpers/getAllChildrenAsThoughtsByContext'
import getAllChildrenByContext from '../../test-helpers/getAllChildrenByContext'
import newThoughtAtFirstMatch from '../../test-helpers/newThoughtAtFirstMatch'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import { compareThought } from '../../util/compareThought'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'

it('edit a thought', () => {
  const steps = [newThought({ value: 'a' }), newThought({ value: 'b' }), setCursor(['a']), editThought(['a'], 'aa')]
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

  // sort children for order-insensitive matching
  const childrenSorted = getAllChildrenAsThoughtsByContext(stateNew, [HOME_TOKEN]).sort(compareThought)
  expect(childrenSorted).toMatchObject([
    {
      id: contextToThoughtId(stateNew, ['aa'])!,
      value: 'aa',
      parentId: HOME_TOKEN,
      rank: 0,
    },
    {
      id: contextToThoughtId(stateNew, ['b'])!,
      value: 'b',
      parentId: HOME_TOKEN,
      rank: 1,
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
    editThought(['a', 'a1'], 'aa1'),
  ]
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
    editThought(['a'], 'aa'),
  ]

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

  expect(getAllChildrenAsThoughtsByContext(stateNew, ['aa'])).toMatchObject([
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
    editThought(['a', 'ab'], 'abc'),
  ]

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

  expect(getAllChildrenAsThoughtsByContext(stateNew, ['a'])).toMatchObject([
    {
      value: 'abc',
      rank: 0,
      id: thoughtABC.id,
    },
  ])
})

it('move cursor to existing meta programming thought if any', () => {
  const text = `
- a
  - =style
    - color
      - lightblue`

  const steps = [importText({ text }), setCursor(['a']), newSubthought({ value: '' }), editThought(['a', ''], '=style')]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =style
      - color
        - lightblue`)

  const expectedCursor = [
    { value: 'a', rank: 0 },
    { value: '=style', rank: 0 },
  ]

  const cursorThoughts = childIdsToThoughts(stateNew, stateNew.cursor!)

  expect(cursorThoughts).toMatchObject(expectedCursor)
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
    editThought(['b', 'a'], 'ab'),
  ]

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

  expect(getAllChildrenAsThoughtsByContext(stateNew, ['a'])).toMatchObject([
    {
      value: 'ab',
      rank: 0,
      id: thoughtInContextA.id,
    },
  ])

  expect(getAllChildrenAsThoughtsByContext(stateNew, ['b'])).toMatchObject([
    { value: 'ab', rank: 0, id: thoughtInContextB.id },
  ])
})

it('edit a child with the same value as its parent', () => {
  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'a', insertNewSubthought: true }),
    editThought(['a', 'a'], 'ab'),
  ]

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
  expect(getAllChildrenAsThoughtsByContext(stateNew, ['a'])).toMatchObject([
    { value: 'ab', rank: 0, id: thoughtInContextA.id },
  ])

  // cursor should be /a/ab
  expectPathToEqual(stateNew, stateNew.cursor, [
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
    editThought(['a'], 'as'),
    editThought(['as'], 'a'),
  ]

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

  const steps = [importText({ text }), setCursor(['a']), editThought(['a'], 'azkaban')]

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

  const steps = [importText({ text }), setCursor(['']), editThought([''], 'x')]

  const stateNew = reducerFlow(steps)(initialState())
  const { missingLexemeValues, missingParentIds } = checkDataIntegrity(stateNew)

  expect(missingLexemeValues).toHaveLength(0)
  expect(missingParentIds).toHaveLength(0)
})

describe('sort', () => {
  it('rank should change when editing a thought in a sorted context', () => {
    const text = `
    - =sort
      - Alphabetical
    - a
    - b
    - d`

    const state1 = importText({ text })(initialState())

    const a1 = contextToThought(state1, ['a'])!
    const b1 = contextToThought(state1, ['b'])!
    const d1 = contextToThought(state1, ['d'])!

    const steps = [setCursor(['a']), editThought(['a'], 'c')]

    const stateNew = reducerFlow(steps)(state1)
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - =sort
    - Alphabetical
  - b
  - c
  - d`)

    const b2 = contextToThought(stateNew, ['b'])!
    const c2 = contextToThought(stateNew, ['c'])!
    const d2 = contextToThought(stateNew, ['d'])!

    // rank of edited thought should change
    expect(c2.rank).not.toEqual(a1.rank)

    // rank of siblings should not
    expect(b2.rank).toEqual(b1.rank)
    expect(d2.rank).toEqual(d1.rank)
  })

  it('empty thought in sorted context should be sorted on edit', () => {
    const text = `
    - =sort
      - Alphabetical
    - A
    - C
    - D`

    const steps = [
      importText({ text }),
      setCursor(null),
      newThought({ value: '', insertNewSubthought: true }),
      setCursor(['']),
      editThought([''], 'b'),
    ]

    const state = reducerFlow(steps)(initialState())

    const exported = exportContext(state, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - =sort
    - Alphabetical
  - A
  - b
  - C
  - D`)
  })

  it('rank should not change when editing a thought to empty', () => {
    const text = `
    - =sort
      - Alphabetical
    - a
    - b
    - c`

    const state1 = importText({ text })(initialState())

    const a1 = contextToThought(state1, ['a'])!
    const b1 = contextToThought(state1, ['b'])!
    const c1 = contextToThought(state1, ['c'])!

    const steps = [setCursor(['b']), editThought(['b'], '')]

    const stateNew = reducerFlow(steps)(state1)
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - =sort
    - Alphabetical
  - a
  - 
  - c`)

    const a2 = contextToThought(stateNew, ['a'])!
    const empty2 = contextToThought(stateNew, [''])!
    const c2 = contextToThought(stateNew, ['c'])!

    expect(a2.rank).toEqual(a1.rank)
    expect(empty2.rank).toEqual(b1.rank)
    expect(c2.rank).toEqual(c1.rank)
  })
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
      editThought(['a'], 'ac'),
    ]

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
      editThought(['a'], 'ac'),
    ]

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
