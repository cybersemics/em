import settings from '../../actions/settings'
import toggleEmContext from '../../actions/toggleEmContext'
import { EM_TOKEN } from '../../constants'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import getThoughtById from '../getThoughtById'
import linearizeTree from '../linearizeTree'

describe('em context', () => {
  it('render the EM subtree when the EM context is the outline root', () => {
    const steps = [settings({ key: 'Theme', value: 'Dark' }), toggleEmContext]

    const stateNew = reducerFlow(steps)(initialState())

    const values = linearizeTree(stateNew).map(node => getThoughtById(stateNew, node.thoughtId)?.value)

    // Settings is a child of the EM root; Theme is expanded because the cursor is on Settings
    expect(values).toContain('Settings')
    expect(values).toContain('Theme')

    // every rendered path is rooted at the EM token
    linearizeTree(stateNew).forEach(node => {
      expect(node.path[0]).toBe(EM_TOKEN)
    })
  })

  it('render nothing from the EM context when the outline root is HOME', () => {
    const steps = [settings({ key: 'Theme', value: 'Dark' })]

    const stateNew = reducerFlow(steps)(initialState())

    const values = linearizeTree(stateNew).map(node => getThoughtById(stateNew, node.thoughtId)?.value)

    expect(values).not.toContain('Settings')
  })
})
