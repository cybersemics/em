// util
import {
  expandThoughts,
} from '../util.js'

export default (state, { value }) => {

  if (!state.cursor) return

  return {
    expanded: expandThoughts(state.cursor, state.thoughtIndex, state.contextIndex),
  }
}
