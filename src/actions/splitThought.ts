import _ from 'lodash'
import Path from '../@types/Path'
import SplitResult from '../@types/SplitResult'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import editThought from '../actions/editThought'
import editableRender from '../actions/editableRender'
import newThought from '../actions/newThought'
import getThoughtById from '../selectors/getThoughtById'
import simplifyPath from '../selectors/simplifyPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import head from '../util/head'
import reducerFlow from '../util/reducerFlow'
import strip from '../util/strip'
import trimHtml from '../util/trimHtml'

/** Splits a thought into two thoughts.
 *
 * @param path     The path of the thought to split. Defaults to cursor.
 * @param offset   The index within the thought at which to split. Defaults to the browser selection offset.
 */
const splitThought = (state: State, { path, splitResult }: { path?: Path; splitResult: SplitResult }) => {
  path = path || (state.cursor as Path)

  const simplePath = simplifyPath(state, path)

  const headThought = getThoughtById(state, head(simplePath))
  if (!headThought) return state
  // split the value into left and right parts
  const { value } = headThought

  const valueLeft = strip(trimHtml(splitResult.left), { preserveFormatting: true })
  const valueRight = strip(trimHtml(splitResult.right), { preserveFormatting: true })

  const pathLeft = path

  return reducerFlow([
    // set the thought's text to the left of the selection
    editThought({
      oldValue: value,
      newValue: valueLeft,
      path: simplePath,
    }),

    // create a new thought with the text to the right of the selection
    newThought({
      value: valueRight,
      at: pathLeft,
      // selection offset
      offset: 0,
      // move the cursor to the second thought so the user can continue typing where the caret was
      preventSetCursor: false,
      // pass splitSource as prop if the left splitted value has whitespace at the end or right splitted value has whitespace at the front
      ...(/\s+$/g.test(splitResult.left) || /^\s+/g.test(splitResult.right) ? { splitSource: headThought.id } : {}),
    }),

    // render
    editableRender,
  ])(state)
}

/** Action-creator for splitThought. */
export const splitThoughtActionCreator =
  (payload: Parameters<typeof splitThought>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'splitThought', ...payload })

export default _.curryRight(splitThought)

// Register this action's metadata
registerActionMetadata('splitThought', {
  undoable: true,
})
