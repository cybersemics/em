import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import setDescendant from '../actions/setDescendant'
import * as selection from '../device/selection'
import pathToThought from '../selectors/pathToThought'
import reducerFlow from '../util/reducerFlow'
import deleteAttribute from './deleteAttribute'

/** Sets the text color or background color of the cursor. */
const textColor = (
  state: State,
  {
    backgroundColor,
    color,
    shape,
    fullySelected,
  }: { backgroundColor?: string; color?: string; shape?: 'bullet' | 'text'; fullySelected?: boolean },
) => {
  if (!state.cursor) return state
  const path = state.cursor
  // set bullet to text color when the entire thought selected
  const newState =
    fullySelected && ((color && color !== 'default') || (backgroundColor && backgroundColor !== 'inverse'))
      ? [setDescendant({ path, values: ['=bullet', '=style', 'color', backgroundColor! || color!] })]
      : [deleteAttribute({ path, values: ['=bullet', '=style', 'color'] })]
  return reducerFlow(newState)(state)
}

/** Action-creator for textColor. */
export const textColorActionCreator =
  (payload: Parameters<typeof textColor>[1]): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    const thought = pathToThought(state, state.cursor!)
    const thoughtText = thought.value.replace(/<[^>]*>/g, '')
    const fullySelected =
      (selection.text()?.length === 0 && thoughtText.length !== 0) || selection.text()?.length === thoughtText.length
    dispatch({ type: 'textColor', ...payload, fullySelected })
  }

export default _.curryRight(textColor)
