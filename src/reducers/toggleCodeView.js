// util
import {
  equalPath,
} from '../util'

/** Toggles the code view. */
export default (state, { value }) => ({
  ...state,
  codeView: equalPath(state.cursor, state.codeView) || value === false ? null : state.cursor
})
