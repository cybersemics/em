import _ from 'lodash'
import State from '../@types/State'

/** See State.alertActive. */
const alertActive = (state: State, { value }: { value: boolean }) => ({
  ...state,
  alertActive: value,
})

export default _.curryRight(alertActive)
