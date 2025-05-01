import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import setDescendant from '../actions/setDescendant'
import * as selection from '../device/selection'
import pathToThought from '../selectors/pathToThought'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import stripTags from '../util/stripTags'
import deleteAttribute from './deleteAttribute'

/** Sets the bullet color of the cursor. */
const bulletColor = (
  state: State,
  {
    backgroundColor,
    color,
    fullySelected,
  }: { backgroundColor?: string; color?: string; shape?: 'bullet' | 'text'; fullySelected?: boolean },
) => {
  if (!state.cursor) return state
  const path = state.cursor
  // set bullet to text color when the entire thought selected
  return fullySelected && ((color && color !== 'default') || (backgroundColor && backgroundColor !== 'inverse'))
    ? setDescendant(state, { path, values: ['=bullet', '=style', 'color', backgroundColor! || color!] })
    : deleteAttribute(state, { path, values: ['=bullet', '=style', 'color'] })
}

/** Action-creator for bulletColor. */
export const bulletColorActionCreator =
  (payload: Parameters<typeof bulletColor>[1]): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    if (!state.cursor) return
    const thought = pathToThought(state, state.cursor)
    if (!thought) return
    const thoughtText = stripTags(thought.value)
    const fullySelected =
      (selection.text()?.length === 0 && thoughtText.length !== 0) || selection.text()?.length === thoughtText.length
    dispatch({ type: 'bulletColor', ...payload, fullySelected })
  }

export default _.curryRight(bulletColor)

// Register this action's metadata
registerActionMetadata('bulletColor', {
  undoable: true,
})
