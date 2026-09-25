import { EM_TOKEN, SETTINGS_TOKEN, SETTINGS_VALUE } from '../../constants'
import findDescendant from '../../selectors/findDescendant'
import { getAllChildrenAsThoughts } from '../../selectors/getChildren'
import initStore from '../../test-helpers/initStore'
import runDocumentCommand from '../../test-helpers/runDocumentCommand'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'
import initialState from '../../util/initialState'
import settings from '../settings'

beforeEach(initStore)
afterEach(waitForThoughtspaceIdle)

it('uses the bootstrapped Settings thought without creating a duplicate', () => {
  const stateNew = runDocumentCommand(
    (state, document) =>
      settings(
        state,
        {
          key: 'Tutorial',
          value: 'Off',
        },
        document,
      ),
    initialState(),
  )

  expect(findDescendant(stateNew, EM_TOKEN, SETTINGS_VALUE)).toBe(SETTINGS_TOKEN)
  expect(findDescendant(stateNew, EM_TOKEN, [SETTINGS_VALUE, 'Tutorial', 'Off'])).toBeTruthy()

  const settingsChildren = getAllChildrenAsThoughts(stateNew, EM_TOKEN).filter(
    thought => thought.value === SETTINGS_VALUE,
  )
  expect(settingsChildren.map(thought => thought.id)).toEqual([SETTINGS_TOKEN])
})
