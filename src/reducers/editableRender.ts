import { State } from '../util/initialState'

/** Forces content editable to update inner html if html has not changed. */
const editableRender = (state: State) => ({
  ...state,
  editableNonce: state.editableNonce + 1
})

export default editableRender
