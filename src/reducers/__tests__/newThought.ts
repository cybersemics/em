import { HOME_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { exportContext } from '../../selectors'
import newThought from '../newThought'

it('new thought in root', () => {

  const stateNew = newThought(initialState(), { value: 'a' })
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a`)

})

it('new thought after', () => {

  const steps = [
    newThought('a'),
    newThought('b'),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
  - b`)

})

it('new thought before', () => {

  const steps = [
    newThought('a'),
    newThought({ value: 'b', insertBefore: true }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - b
  - a`)

})

it('new subthought', () => {

  const steps = [
    newThought('a'),
    newThought({ value: 'b', insertNewSubthought: true }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b`)
})

it('new subthought top', () => {

  const steps = [
    newThought('a'),
    newThought({ value: 'b', insertNewSubthought: true }),
    newThought('c'),
    newThought({ value: 'd', at: [{ value: 'a', rank: 0 }], insertNewSubthought: true, insertBefore: true }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - d
    - b
    - c`)
})

it('update cursor to first new thought', () => {

  const stateNew = newThought(initialState(), { value: 'a' })

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }])

})

it('update cursor to new thought', () => {

  const steps = [
    newThought('a'),
    newThought('b'),
  ]

  // run steps through reducer flow
  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'b', rank: 1 }])

})
