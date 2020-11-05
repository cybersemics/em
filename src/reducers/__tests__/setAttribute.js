import { ROOT_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { exportContext } from '../../selectors'

// reducers
import newSubthought from '../newSubthought'
import newThought from '../newThought'
import setCursor from '../setCursor'
import setAttribute from '../setAttribute'

it('set', () => {

  const steps = [
    newThought('a'),
    setAttribute({
      context: ['a'],
      key: '=test',
      value: 'hello'
    })
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - =test
      - hello`)

})

it('different value should override existing value', () => {

  const steps = [
    newThought('a'),
    setAttribute({
      context: ['a'],
      key: '=test',
      value: 'hello'
    }),
    setAttribute({
      context: ['a'],
      key: '=test',
      value: 'goodbye'
    })
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - =test
      - goodbye`)

})

it('add attribute if key has already been created', () => {

  const steps = [
    newThought('a'),
    newSubthought('=test'),
    setCursor({ path: [{ value: 'a', rank: 0 }] }),
    setAttribute({
      context: ['a'],
      key: '=test',
      value: 'hello'
    }),
    setAttribute({
      context: ['a'],
      key: '=test',
      value: 'goodbye'
    })
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a
    - =test
      - goodbye`)

})
