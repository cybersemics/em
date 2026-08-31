import { EM_TOKEN, SETTINGS_TOKEN, SETTINGS_VALUE } from '../../constants'
import findDescendant from '../../selectors/findDescendant'
import { getAllChildrenAsThoughts } from '../../selectors/getChildren'
import initialState from '../../util/initialState'
import settings from '../settings'

it('uses the bootstrapped Settings thought without creating a duplicate', () => {
  const stateNew = settings(initialState(), {
    key: 'Tutorial',
    value: 'Off',
  })

  expect(findDescendant(stateNew, EM_TOKEN, SETTINGS_VALUE)).toBe(SETTINGS_TOKEN)
  expect(findDescendant(stateNew, EM_TOKEN, [SETTINGS_VALUE, 'Tutorial', 'Off'])).toBeTruthy()

  const settingsChildren = getAllChildrenAsThoughts(stateNew, EM_TOKEN).filter(
    thought => thought.value === SETTINGS_VALUE,
  )
  expect(settingsChildren.map(thought => thought.id)).toEqual([SETTINGS_TOKEN])
})
