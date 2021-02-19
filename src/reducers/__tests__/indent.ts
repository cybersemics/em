import { HOME_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { exportContext } from '../../selectors'
import { indent, newSubthought, newThought, setCursor } from '../../reducers'

it('indent within root', () => {

  const steps = [
    newThought('a'),
    newThought('b'),
    indent,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b`)

})

it('indent with no cursor should do nothing ', () => {

  const steps = [
    newThought('a'),
    newThought('b'),
    setCursor({ path: null }),
    indent,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
  - b`)

})

it('indent fully indented thought should do nothing ', () => {

  const steps = [
    newThought('a'),
    newSubthought('b'),
    indent,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b`)

})

it('indent within context', () => {

  const steps = [
    newThought('a'),
    newSubthought('a1'),
    newThought('a2'),
    indent,
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - a1
      - a2`)

})

it('indent on cursor thought should update cursor', () => {

  const steps = [
    newThought('a'),
    newSubthought('a1'),
    newThought('a2'),
    indent,
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }, { value: 'a1', rank: 0 }, { value: 'a2', rank: 0 }])

})
