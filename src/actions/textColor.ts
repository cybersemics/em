import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import setDescendant from '../actions/setDescendant'
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
  const sel = window.getSelection()

  // set bullet to text color when the entire thought selected
  if ((sel?.toString().length === 0 && thought.value.length !== 0) || sel?.toString().length === thought.value.length) {
    return reducerFlow([
      color && color !== 'default'
        ? setDescendant({ path, values: ['=bullet', '=style', 'color', backgroundColor || color] })
        : deleteAttribute({ path, values: ['=bullet', '=style', 'color'] }),
    ])(state)
  }
  return state
}

/** Action-creator for textColor. */
export const textColorActionCreator =
  (payload: Parameters<typeof textColor>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'textColor', ...payload })

export default _.curryRight(textColor)
