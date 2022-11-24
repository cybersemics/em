import { toggleAttribute } from '.'
import _ from 'lodash'
import State from '../@types/State'

/** Toggles the italic font style of the cursor. */
const italic = (state: State) => {
  if (!state.cursor) return state
  const path = state.cursor

  return toggleAttribute(state, { path, values: ['=style', 'fontStyle', 'italic'] })
}

export default _.curryRight(italic)
