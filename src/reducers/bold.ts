import { toggleAttribute } from '.'
import _ from 'lodash'
import State from '../@types/State'

/** Toggles the bold font weight of the cursor. */
const bold = (state: State) => {
  if (!state.cursor) return state
  const path = state.cursor

  return toggleAttribute(state, { path, values: ['=style', 'fontWeight', '700'] })
}

export default _.curryRight(bold)
