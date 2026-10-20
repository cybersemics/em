import State from '../@types/State'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import command from '../util/command'
import storage from '../util/storage'
import settings from './settings'

/** Sets the Tutorial setting value. */
const tutorial = (state: State, { value }: { value?: boolean }, transaction?: ThoughtspaceTransaction) => ({
  ...settings(
    state,
    {
      key: 'Tutorial',
      value: value ? 'On' : 'Off',
    },
    transaction,
  ),
  // disable isLoading when dismissing the tutorial, since we can assume this is a new thoughtspace or the thoughtspace has already been loaded
  isLoading: state.isLoading && value,
})

/** Updates the tutorial. Waits for tutorial settings to load first. */
export const tutorialActionCreator =
  ({ value }: { value: boolean }): Thunk =>
  async dispatch => {
    // TODO: Consolidate with cached Settings
    storage.setItem('Settings/Tutorial', value ? 'On' : 'Off')
    dispatch({ type: 'tutorial', value })
  }

export default command(tutorial)

// Register this action's metadata
registerActionMetadata('tutorial', {
  undoable: false,
})
