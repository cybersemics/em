import State from '../@types/State'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Forces content editable to update inner html if html has not changed. Optionally sets the cursor offset that useEditMode places the caret at on the forced render. */
const editableRender = (state: State, { cursorOffset }: { cursorOffset?: number } = {}) => ({
  ...state,
  editableNonce: state.editableNonce + 1,
  ...(cursorOffset != null ? { cursorOffset } : null),
})

export default editableRender

// Register this action's metadata
registerActionMetadata('editableRender', {
  undoable: false,
})
