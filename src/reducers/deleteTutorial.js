import { ROOT_TOKEN, TUTORIAL_STEP4_END } from '../constants'
import { timestamp, encodeItems } from '../util'
import { settings } from './settings'

export const deleteTutorial = (state) => () => {

  const rootEncoded = encodeItems([ROOT_TOKEN])

  return Object.assign({
    data: Object.assign({}, Object.keys(state.data).reduce((accum, cur) => {
      return Object.assign({}, !state.data[cur] || !state.data[cur].tutorial ? {
        [cur]: state.data[cur]
      } : null, accum)
    }, {})),
    contextChildren: Object.assign({}, state.contextChildren, {
      [rootEncoded]: state.contextChildren[rootEncoded]
        .filter(child => !child.tutorial)
    }),
    lastUpdated: timestamp(),
    dataNonce: state.dataNonce + 1
  }, settings({
      type: 'settings',
      key: 'tutorialStep',
      value: TUTORIAL_STEP4_END
    }, state))
}