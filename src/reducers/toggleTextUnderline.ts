import { toggleAttribute } from '.'
import _ from 'lodash'
import State from '../@types/State'

/** Sets the text color or background color of the cursor. */
const toggleTextUnderline = (state: State) => {
  if (!state.cursor) return state
  const path = state.cursor

  return toggleAttribute(state, { path, values: ['=style', 'textDecoration', 'underline'] })
}

export default _.curryRight(toggleTextUnderline)
