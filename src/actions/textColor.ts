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
  { backgroundColor, color, shape }: { backgroundColor?: string; color?: string; shape?: 'bullet' | 'text' },
) => {
  if (!state.cursor) return state
  const path = state.cursor

  const thought = pathToThought(state, state.cursor)
  const thoughtText = thought.value.replace(/<[^>]*>/g, '')
  // set bullet to text color when the entire thought selected
  if ((selection.text()?.length === 0 && thoughtText.length !== 0) || selection.text()?.length === thoughtText.length) {
    return reducerFlow([
      color && color !== 'default'
        ? setDescendant({ path, values: ['=bullet', '=style', 'color', backgroundColor || color] })
        : deleteAttribute({ path, values: ['=bullet', '=style', 'color'] }),
    ])(state)
  } else return reducerFlow([deleteAttribute({ path, values: ['=bullet', '=style', 'color'] })])(state)
}

/** Action-creator for textColor. */
export const textColorActionCreator =
  (payload: Parameters<typeof textColor>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'textColor', ...payload })

export default _.curryRight(textColor)
