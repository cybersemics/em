import { ROOT_TOKEN } from '../../constants'

// util
import { initialState, reducerFlow } from '../../util'

// reducers
import {
  collapseContext,
  newSubthought,
  newThought,
} from '../../reducers'

// selectors
import {
  exportContext,
} from '../../selectors'

it('do nothing on leaf', () => {

  const steps = [
    newThought('a'),
    newSubthought('b'),
    collapseContext,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const state = initialState()
  const stateNew = reducerFlow(steps)(state)
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  console.log('exported', exported)

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - b`)

  expect(stateNew.cursor).toMatchObject(state.cursor)

})

// it('collapse context with single child', () => {

//   const steps = [
//     newThought('a'),
//     newSubthought('b'),
//     newSubthought('c'),
//     cursorBack,
//     collapseContext,
//   ]

//   // run steps through reducer flow and export as plaintext for readable test
//   const stateNew = reducerFlow(steps)(initialState())
//   const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

//   expect(exported).toBe(`- ${ROOT_TOKEN}
//   - a
//     - =archive
//       - b
//     - c`)

//   expect(stateNew.cursor)
//     .toMatchObject([{ value: 'a', rank: 0 }, { value: 'c', rank: 0 }])

// })

// it('collapse context with multiple children', () => {

//   const steps = [
//     newThought('a'),
//     newSubthought('b'),
//     newSubthought('c'),
//     newThought('d'),
//     cursorBack,
//     collapseContext,
//   ]

//   // run steps through reducer flow and export as plaintext for readable test
//   const stateNew = reducerFlow(steps)(initialState())
//   const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

//   expect(exported).toBe(`- ${ROOT_TOKEN}
//   - a
//     - =archive
//       - b
//     - c
//     - d`)

//   expect(stateNew.cursor)
//     .toMatchObject([{ value: 'a', rank: 0 }, { value: 'c', rank: 0 }])

// })

// it('merge children', () => {

//   const steps = [
//     newThought('a'),
//     newSubthought('b'),
//     newThought('x'),
//     cursorUp,
//     newSubthought('c'),
//     newThought('d'),
//     cursorBack,
//     collapseContext,
//   ]

//   // run steps through reducer flow and export as plaintext for readable test
//   const stateNew = reducerFlow(steps)(initialState())
//   const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

//   expect(exported).toBe(`- ${ROOT_TOKEN}
//   - a
//     - =archive
//       - b
//     - c
//     - d
//     - x`)

//   expect(stateNew.cursor)
//     .toMatchObject([{ value: 'a', rank: 0 }, { value: 'c', rank: 0 }])

// })

// it('merge duplicate children', () => {

//   const steps = [
//     newThought('a'),
//     newSubthought('b'),
//     newThought('d'),
//     cursorUp,
//     newSubthought('c'),
//     newThought('d'),
//     cursorBack,
//     collapseContext,
//   ]

//   // run steps through reducer flow and export as plaintext for readable test
//   const stateNew = reducerFlow(steps)(initialState())
//   const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

//   expect(exported).toBe(`- ${ROOT_TOKEN}
//   - a
//     - =archive
//       - b
//     - c
//     - d`)

//   expect(stateNew.cursor)
//     .toMatchObject([{ value: 'a', rank: 0 }, { value: 'c', rank: 0 }])

// })
