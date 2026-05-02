import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import * as selection from '../device/selection'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Toggles (hide/show) the mobile command universe. */
const toggleMobileCommandUniverse = (state: State, { value }: { value?: boolean }) => ({
  ...state,
  showMobileCommandUniverse: value == null ? !state.showMobileCommandUniverse : value,
})

/** Action-creator for toggleMobileCommandUniverse. */
export const toggleMobileCommandUniverseActionCreator =
  ({ value }: Parameters<typeof toggleMobileCommandUniverse>[1]): Thunk =>
  dispatch => {
    if (value) {
      selection.clear()
    }
    dispatch({ type: 'toggleMobileCommandUniverse', value })
  }

export default _.curryRight(toggleMobileCommandUniverse)

registerActionMetadata('toggleMobileCommandUniverse', {
  undoable: false,
})
