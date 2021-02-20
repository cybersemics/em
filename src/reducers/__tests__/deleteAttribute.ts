import { HOME_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { exportContext } from '../../selectors'

// reducers
import deleteAttribute from '../deleteAttribute'
import newThought from '../newThought'
import setAttribute from '../setAttribute'

it('delete attribute', () => {

  const steps = [

    // new thought
    newThought('a'),

    // set attribute
    setAttribute({
      context: ['a'],
      key: '=test',
      value: 'hello'
    }),

    // delete attribute
    deleteAttribute({
      context: ['a'],
      key: '=test'
    })
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a`)

})
