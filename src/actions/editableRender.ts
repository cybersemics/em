import State from '../@types/State'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Forces content editable to update inner html if html has not changed. */
const editableRender = (state: State) => ({
  ...state,
  editableNonce: state.editableNonce + 1,
})

export default editableRender

// Register this action's metadata
registerActionMetadata('editableRender', {
  undoable: false,
})
