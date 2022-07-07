import State from '../../@types/State'
import { HOME_TOKEN } from '../../constants'
import contextToPath from '../../selectors/contextToPath'
import exportContext from '../../selectors/exportContext'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
// reducers
import deleteAttribute from '../deleteAttribute'
import newThought from '../newThought'
import setAttribute from '../setAttribute'

it('delete attribute', () => {
  const steps = [
    // new thought
    newThought('a'),

    // set attribute
    (state: State) =>
      setAttribute(state, {
        path: contextToPath(state, ['a'])!,
        key: '=test',
        value: 'hello',
      }),
    // delete attribute
    (state: State) =>
      deleteAttribute(state, {
        path: contextToPath(state, ['a'])!,
        key: '=test',
      }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a`)
})
