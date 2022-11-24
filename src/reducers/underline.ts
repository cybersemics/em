import { toggleAttribute } from '.'
import _ from 'lodash'
import State from '../@types/State'

/** Toggles the underline decoration of the cursor. */
const underline = (state: State) => {
  if (!state.cursor) return state
  const path = state.cursor

  return toggleAttribute(state, { path, values: ['=style', 'textDecoration', 'underline'] })
}

export default _.curryRight(underline)
