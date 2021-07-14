import { HOME_TOKEN } from '../../constants'
import { hashContext, initialState, reducerFlow } from '../../util'
import { exportContext } from '../../selectors'

// reducers
import newSubthought from '../newSubthought'
import newThought from '../newThought'
import importText from '../importText'
import subCategorizeOne from '../subCategorizeOne'
import setCursor from '../setCursor'

it('subcategorize a thought', () => {
  const steps = [newThought('a'), newSubthought('b'), subCategorizeOne]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - ${'' /* prevent trim_trailing_whitespace */}
      - b`)
})

it('subcategorize a thought in the root', () => {
  const steps = [newThought('a'), subCategorizeOne]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - ${'' /* prevent trim_trailing_whitespace */}
    - a`)
})

it('subcategorize with no cursor should do nothing', () => {
  const steps = [newThought('a'), newSubthought('b'), setCursor({ path: null }), subCategorizeOne]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b`)
})

it('set cursor on new empty thought', () => {
  const steps = [newThought('a'), newSubthought('b'), subCategorizeOne]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor).toMatchObject([
    { value: 'a', rank: 0 },
    { value: '', rank: -1 },
  ])
})

it('subcategorize within alphabteically sorted context', () => {
  const steps = [
    importText({
      text: `
      - A
        - =sort
          - Alphabetical
        - D
        - B
        - C
        - E`,
    }),
    setCursor({
      path: [
        { id: hashContext(['A']), value: 'A', rank: 0 },
        { id: hashContext(['A', 'E']), value: 'E', rank: 4 },
      ],
    }),
    subCategorizeOne,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - A
    - =sort
      - Alphabetical
    - D
    - B
    - C
    - ${'' /* prevent trim_trailing_whitespace */}
      - E`)
})

// Duplicate test: moveThought - "move with duplicate descendant"
// it('subcategorize a thought with duplicate descendants', () => {

//   const text = `
//   - a
//     - b
//       - b`

//   const steps = [
//     importText({ text }),
//     setCursorFirstMatch(['a']),
//     subCategorizeOne,
//   ]

//   // run steps through reducer flow and export as plaintext for readable test
//   const stateNew = reducerFlow(steps)(initialState())
//   const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

//   expect(exported).toBe(`- ${HOME_TOKEN}
//   - ${''/* prevent trim_trailing_whitespace */}
//     - a
//       - b
//         - b`)

// })

// Duplicate test: moveThought - "move with duplicate descendant"
// it('subcategorize a thought with hash matched descendants', () => {

//   const text = `
//   - a
//     - =note
//       - note`

//   const steps = [
//     importText({ text }),
//     setCursorFirstMatch(['a']),
//     subCategorizeOne,
//   ]

//   // run steps through reducer flow and export as plaintext for readable test
//   const stateNew = reducerFlow(steps)(initialState())
//   const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

//   expect(exported).toBe(`- ${HOME_TOKEN}
//   - ${''/* prevent trim_trailing_whitespace */}
//     - a
//       - =note
//         - note`)

// })
