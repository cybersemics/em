import { HOME_PATH, HOME_TOKEN } from '../../constants'
import { hashContext, initialState, reducerFlow } from '../../util'
import {
  exportContext,
  getContexts,
  getAllChildren,
  getLexeme,
  getParent,
  rankThoughtsFirstMatch,
  getParentThought,
} from '../../selectors'
import { editThought, newThought, setCursor, importText } from '../../reducers'
import { Parent, Path, SimplePath, State } from '../../@types'
import { getAllChildrenAsThoughts } from '../../selectors/getChildren'
// import checkDataIntegrity from '../../test-helpers/checkDataIntegrity'

it('edit a thought', () => {
  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'b' }),
    (newState: State) => setCursor(newState, { path: [hashContext(newState, ['a']) || ''] }),
    (newState: State) =>
      editThought(newState, {
        newValue: 'aa',
        oldValue: 'a',
        context: [HOME_TOKEN],
        path: [hashContext(newState, ['a'])] as SimplePath,
      }),
  ]
  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - aa
  - b`)

  const thought = getParent(stateNew, ['aa'])

  // Note: Lexeme now stores refrence to the actual thought instead of the context of the thought. A thought's parent can directly backlinked from Parent.parentId
  // aa should exist in ROOT context

  expect(thought).toBeDefined()
  expect(thought!.parentId).toBe(HOME_TOKEN)

  expect(getContexts(stateNew, 'aa')).toMatchObject([thought!.id])

  const expectedChildren: Partial<Parent>[] = [
    {
      id: hashContext(stateNew, ['b'])!,
      value: 'b',
      parentId: HOME_TOKEN,
      rank: 1,
    },
    {
      id: hashContext(stateNew, ['aa'])!,
      value: 'aa',
      parentId: HOME_TOKEN,
      rank: 0,
    },
  ]
  expect(getAllChildrenAsThoughts(stateNew, [HOME_TOKEN])).toMatchObject(expectedChildren)

  // cursor should be at /aa
  expect(stateNew.cursor).toMatchObject([hashContext(stateNew, ['aa'])])
})

it('edit a descendant', () => {
  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'a1', insertNewSubthought: true }),
    (newState: State) => newThought(newState, { value: 'b', at: [hashContext(newState, ['a']) || ''] }),
    (newState: State) => {
      return editThought(newState, {
        newValue: 'aa1',
        oldValue: 'a1',
        context: ['a'],
        path: rankThoughtsFirstMatch(newState, ['a', 'a1']) as Path as SimplePath,
      })
    },
  ]
  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - aa1
  - b`)

  const aId = hashContext(stateNew, ['a'])!
  const aa1Id = hashContext(stateNew, ['a', 'aa1'])!

  // aa1 should exist in context a
  expect(getContexts(stateNew, 'aa1')).toMatchObject([aa1Id])

  const parent = getParentThought(stateNew, aa1Id)
  expect(parent?.id).toBe(aId)

  expect(getAllChildren(stateNew, ['a'])).toMatchObject([aa1Id])
})

it('edit a thought with descendants', () => {
  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'a1', insertNewSubthought: true }),
    newThought({ value: 'a2' }),
    (newState: State) =>
      editThought(newState, {
        newValue: 'aa',
        oldValue: 'a',
        context: [HOME_TOKEN],
        path: [hashContext(newState, ['a']) || ''] as SimplePath,
      }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - aa
    - a1
    - a2`)

  const thought = getParent(stateNew, ['aa'])
  const thoughtA1 = getParent(stateNew, ['aa', 'a1'])
  const thoughtA2 = getParent(stateNew, ['aa', 'a2'])

  // Note: Lexeme now stores refrence to the actual thought instead of the context of the thought. A thought's parent can directly backlinked from Parent.parentId
  // aa should exist in ROOT context

  expect(thought).toBeDefined()
  expect(thought!.parentId).toBe(HOME_TOKEN)

  // aa should exist in ROOT context
  expect(getContexts(stateNew, 'aa')).toMatchObject([thought!.id])

  expect(thought?.parentId).toBe(HOME_TOKEN)

  const expectedChildren: Partial<Parent>[] = [
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
  ]

  expect(getAllChildrenAsThoughts(stateNew, ['aa'])).toMatchObject(expectedChildren)
})

it('edit a thought existing in mutliple contexts', () => {
  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'ab', insertNewSubthought: true }),
    (newState: State) => newThought(newState, { value: 'b', at: [hashContext(newState, ['a']) || ''] }),
    newThought({ value: 'ab', insertNewSubthought: true }),
    (newState: State) =>
      editThought(newState, {
        newValue: 'abc',
        oldValue: 'ab',
        context: ['a'],
        path: rankThoughtsFirstMatch(newState, ['a', 'ab']) as Path as SimplePath,
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

  const thoughtABC = getParent(stateNew, ['a', 'abc'])!

  // Note: Lexeme now stores refrence to the actual thought instead of the context of the thought. A thought's parent can directly backlinked from Parent.parentId
  // aa should exist in ROOT context

  expect(thoughtABC).not.toBeNull()
  expect(thoughtABC!.parentId).toBe(hashContext(stateNew, ['a']))

  // abc should exist in context a
  expect(getContexts(stateNew, 'abc')).toMatchObject([thoughtABC.id])

  const expectedChildren = [
    {
      value: 'abc',
      rank: 0,
      id: thoughtABC.id,
    },
  ]
  expect(getAllChildrenAsThoughts(stateNew, ['a'])).toMatchObject(expectedChildren)
})

it('edit a thought that exists in another context', () => {
  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'ab', insertNewSubthought: true }),
    (newState: State) => newThought(newState, { value: 'b', at: [hashContext(newState, ['a']) || ''] }),
    newThought({ value: 'a', insertNewSubthought: true }),
    (newState: State) =>
      editThought(newState, {
        newValue: 'ab',
        oldValue: 'a',
        context: ['b'],
        path: rankThoughtsFirstMatch(newState, ['b', 'a']) as Path as SimplePath,
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

  const thoughtInContextA = getParent(stateNew, ['a', 'ab'])!
  const thoughtInContextB = getParent(stateNew, ['b', 'ab'])!

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
    (newState: State) =>
      editThought(newState, {
        newValue: 'ab',
        oldValue: 'a',
        context: ['a'],
        path: rankThoughtsFirstMatch(newState, ['a', 'a']) as Path as SimplePath,
      }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - ab`)

  const thoughtInContextA = getParent(stateNew, ['a', 'ab'])!
  const thoughtA = getParent(stateNew, ['a'])!

  expect(thoughtInContextA).toBeTruthy()
  // ab should exist in context a
  expect(getContexts(stateNew, 'ab')).toMatchObject([thoughtInContextA!.id])

  expect(thoughtInContextA?.parentId).toBe(thoughtA.id)
  expect(getAllChildrenAsThoughts(stateNew, ['a'])).toMatchObject([{ value: 'ab', rank: 0, id: thoughtInContextA.id }])

  // cursor should be /a/ab
  expect(stateNew.cursor).toMatchObject(rankThoughtsFirstMatch(stateNew, ['a', 'ab']))
})

it('do not duplicate children when new and old context are same', () => {
  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'b', insertNewSubthought: true }),
    (newState: State) =>
      editThought(newState, {
        newValue: 'as',
        oldValue: 'a',
        context: [HOME_TOKEN],
        path: [hashContext(newState, ['a'])] as SimplePath,
      }),
    (newState: State) =>
      editThought(newState, {
        newValue: 'a',
        oldValue: 'as',
        context: [HOME_TOKEN],
        path: [hashContext(newState, ['as'])] as SimplePath,
      }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b`)
})

// @MIGRATION_TODO: checkDataIntegrity will change later. So fix integrity tests after migration is complete.

// Issue: https://github.com/cybersemics/em/issues/1095
// it('data integrity test', () => {
//   const text = `
//     - a
//       - b
//         - d
//       - d`

//   const steps = [
//     importText({
//       text,
//     }),
//     (newState: State) =>
//       setCursor(newState, {
//         path: [
//           {
//             id: hashContext(newState, ['a']) || '',
//             value: 'a',
//             rank: 0,
//           },
//         ],
//       }),
//     (newState: State) =>
//       editThought(newState, {
//         newValue: 'azkaban',
//         oldValue: 'a',
//         context: [HOME_TOKEN],
//         path: [{ value: 'a', rank: 0, id: hashContext(newState, ['a']) }] as SimplePath,
//       }),
//   ]

//   // run steps through reducer flow and export as plaintext for readable test
//   const stateNew = reducerFlow(steps)(initialState())
//   const { thoughtIndexUpdates, contextIndexUpdates } = checkDataIntegrity(stateNew)

//   const thoughtUpdates = Object.keys(thoughtIndexUpdates).length
//   const contextUpdates = Object.keys(contextIndexUpdates).length

//   expect(thoughtUpdates).toBe(0)
//   expect(contextUpdates).toBe(0)
// })

// Issue: https://github.com/cybersemics/em/issues/1144
// it('data integrity test after editing a parent with multiple descendants with same value and depth', () => {
//   const text = `
//   - ${' '}
//     - a
//       - m
//     - b
//       - m`

//   const steps = [
//     importText({
//       text,
//     }),
//     (newState: State) =>
//       setCursor(newState, {
//         path: [
//           {
//             id: hashContext(newState, ['']) || '',
//             value: '',
//             rank: 0,
//           },
//         ],
//       }),
//     (newState: State) =>
//       editThought(newState, {
//         newValue: 'x',
//         oldValue: '',
//         context: [HOME_TOKEN],
//         path: [{ value: '', rank: 0, id: hashContext(newState, ['']) }] as SimplePath,
//       }),
//   ]

//   // run steps through reducer flow and export as plaintext for readable test
//   const stateNew = reducerFlow(steps)(initialState())
//   const { thoughtIndexUpdates, contextIndexUpdates } = checkDataIntegrity(stateNew)

//   const thoughtUpdates = Object.keys(thoughtIndexUpdates).length
//   const contextUpdates = Object.keys(contextIndexUpdates).length

//   expect(thoughtUpdates).toBe(0)
//   expect(contextUpdates).toBe(0)
// })

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
      (newState: State) => {
        return editThought(newState, {
          newValue: 'ac',
          oldValue: 'a',
          context: [HOME_TOKEN],
          path: [hashContext(newState, ['a'])] as SimplePath,
        })
      },
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
      (newState: State) =>
        editThought(newState, {
          newValue: 'ac',
          oldValue: 'a',
          context: [HOME_TOKEN],
          path: [hashContext(newState, ['a'])] as SimplePath,
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
