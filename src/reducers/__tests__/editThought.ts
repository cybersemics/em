import { HOME_PATH, HOME_TOKEN } from '../../constants'
import { hashContext, initialState, reducerFlow } from '../../util'
import { exportContext, getContexts, getAllChildren, getLexeme } from '../../selectors'
import { editThought, newThought, setCursor, importText } from '../../reducers'
import { Path, SimplePath, State } from '../../@types'
// import checkDataIntegrity from '../../test-helpers/checkDataIntegrity'

it('edit a thought', () => {
  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'b' }),
    (newState: State) =>
      setCursor(newState, { path: [{ id: hashContext(newState, ['a']) || '', value: 'a', rank: 0 }] }),
    (newState: State) =>
      editThought(newState, {
        newValue: 'aa',
        oldValue: 'a',
        context: [HOME_TOKEN],
        path: [{ value: 'a', rank: 0, id: hashContext(newState, ['a']) }] as SimplePath,
      }),
  ]
  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - aa
  - b`)

  // aa should exist in ROOT context
  expect(getContexts(stateNew, 'aa')).toMatchObject([
    {
      context: [HOME_TOKEN],
    },
  ])
  expect(getAllChildren(stateNew, [HOME_TOKEN])).toMatchObject([
    { value: 'b', rank: 1 },
    { value: 'aa', rank: 0 },
  ])

  // cursor should be at /aa
  expect(stateNew.cursor).toMatchObject([{ value: 'aa', rank: 0 }])
})

it('edit a descendant', () => {
  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'a1', insertNewSubthought: true }),
    (newState: State) =>
      newThought(newState, { value: 'b', at: [{ id: hashContext(newState, ['a']) || '', value: 'a', rank: 0 }] }),
    (newState: State) => {
      return editThought(newState, {
        newValue: 'aa1',
        oldValue: 'a1',
        context: ['a'],
        path: [
          { id: hashContext(newState, ['a']) as string, value: 'a', rank: 1 },
          { id: hashContext(newState, ['a', 'a1']) as string, value: 'a1', rank: 0 },
        ] as Path as SimplePath,
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

  // aa1 should exist in context a
  expect(getContexts(stateNew, 'aa1')).toMatchObject([
    {
      context: ['a'],
      rank: 0,
    },
  ])
  expect(getAllChildren(stateNew, ['a'])).toMatchObject([{ value: 'aa1', rank: 0 }])
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
        path: [{ value: 'a', rank: 0, id: hashContext(newState, ['a']) || '' }] as SimplePath,
      }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - aa
    - a1
    - a2`)

  // aa should exist in ROOT context
  expect(getContexts(stateNew, 'aa')).toMatchObject([
    {
      context: [HOME_TOKEN],
    },
  ])
  expect(getAllChildren(stateNew, ['aa'])).toMatchObject([
    { value: 'a1', rank: 0 },
    { value: 'a2', rank: 1 },
  ])
})

it('edit a thought existing in mutliple contexts', () => {
  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'ab', insertNewSubthought: true }),
    (newState: State) =>
      newThought(newState, { value: 'b', at: [{ id: hashContext(newState, ['a']) || '', value: 'a', rank: 0 }] }),
    newThought({ value: 'ab', insertNewSubthought: true }),
    (newState: State) =>
      editThought(newState, {
        newValue: 'abc',
        oldValue: 'ab',
        context: ['a'],
        path: [{ id: hashContext(newState, ['a']) || '', value: 'a', rank: 0 }] as SimplePath,
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

  // abc should exist in context a
  expect(getContexts(stateNew, 'abc')).toMatchObject([
    {
      context: ['a'],
    },
  ])
  expect(getAllChildren(stateNew, ['a'])).toMatchObject([{ value: 'abc', rank: 0 }])
})

it('edit a thought that exists in another context', () => {
  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'ab', insertNewSubthought: true }),
    (newState: State) =>
      newThought(newState, { value: 'b', at: [{ id: hashContext(newState, ['a']) || '', value: 'a', rank: 0 }] }),
    newThought({ value: 'a', insertNewSubthought: true }),
    (newState: State) =>
      editThought(newState, {
        newValue: 'ab',
        oldValue: 'a',
        context: ['b'],
        path: [
          { value: 'b', rank: 1, id: hashContext(newState, ['b']) || '' },
          { value: 'a', rank: 0, id: hashContext(newState, ['b', 'a']) || '' },
        ] as Path as SimplePath,
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

  // ab should exist in both contexts a and b
  expect(getContexts(stateNew, 'ab')).toMatchObject([
    {
      context: ['a'],
      rank: 0,
    },
    {
      context: ['b'],
      rank: 0,
    },
  ])

  expect(getAllChildren(stateNew, ['a'])).toMatchObject([{ value: 'ab', rank: 0 }])

  expect(getAllChildren(stateNew, ['a'])).toMatchObject([{ value: 'ab', rank: 0 }])
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
        path: [
          { value: 'a', rank: 0, id: hashContext(newState, ['a']) },
          { value: 'a', rank: 0, id: hashContext(newState, ['a', 'a']) },
        ] as Path as SimplePath,
      }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - ab`)

  // ab should exist in context a
  expect(getContexts(stateNew, 'ab')).toMatchObject([
    {
      context: ['a'],
      rank: 0,
    },
  ])
  expect(getAllChildren(stateNew, ['a'])).toMatchObject([{ value: 'ab', rank: 0 }])

  // cursor should be /a/ab
  expect(stateNew.cursor).toMatchObject([
    { value: 'a', rank: 0 },
    { value: 'ab', rank: 0 },
  ])
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
        path: [{ value: 'a', rank: 0, id: hashContext(newState, ['a']) }] as SimplePath,
      }),
    (newState: State) =>
      editThought(newState, {
        newValue: 'a',
        oldValue: 'as',
        context: [HOME_TOKEN],
        path: [{ value: 'as', rank: 0, id: hashContext(newState, ['as']) }] as SimplePath,
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
          path: [{ value: 'a', rank: 0, id: hashContext(newState, ['a']) }] as SimplePath,
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
          path: [{ value: 'a', rank: 0, id: hashContext(newState, ['a']) }] as SimplePath,
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
