import { ROOT_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { exportContext } from '../../selectors'

// reducers
import deleteAttribute from '../deleteAttribute'
import newThought from '../newThought'
import setAttribute from '../setAttribute'

it('delete attribute', () => {

  const steps = [

    // new thought
    state => newThought(state, { value: 'a' }),

    // set attribute
    state => setAttribute(state, {
      context: ['a'],
      key: '=test',
      value: 'hello'
    }),

    // delete attribute
    state => deleteAttribute(state, {
      context: ['a'],
      key: '=test'
    })
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [ROOT_TOKEN], 'text/plaintext')

  expect(exported).toBe(`- ${ROOT_TOKEN}
  - a`)

})
