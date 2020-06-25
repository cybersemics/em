import { equalPath } from '../util'
import { State } from '../util/initialState'

/** Toggles the code view. */
const toggleCodeView = (state: State, { value }: { value?: boolean }) => ({
  ...state,
  codeView: equalPath(state.cursor, state.codeView!) || value === false ? null : state.cursor
})

export default toggleCodeView
