import _ from 'lodash'
import { HOME_TOKEN } from '../constants'
import { appendToPath, parentOf, pathToContext, reducerFlow, strip, head } from '../util'
import { getChildrenRanked, simplifyPath, getThoughtById } from '../selectors'
import { editableRender, editThought, moveThought, newThought, deleteData } from '../reducers'
import { Path, SplitResult, State } from '../@types'

/** Splits a thought into two thoughts.
 *
 * @param path     The path of the thought to split. Defaults to cursor.
 * @param offset   The index within the thought at which to split. Defaults to the browser selection offset.
 */
const splitThought = (state: State, { path, splitResult }: { path?: Path; splitResult: SplitResult }) => {
  path = path || (state.cursor as Path)

  const simplePath = simplifyPath(state, path)

  const thoughts = pathToContext(state, simplePath)
  const context = thoughts.length > 1 ? parentOf(thoughts) : [HOME_TOKEN]

  const headThought = getThoughtById(state, head(simplePath))
  // split the value into left and right parts
  const { value } = headThought

  const valueLeft = strip(splitResult.left, { preserveFormatting: true })
  const valueRight = strip(splitResult.right, { preserveFormatting: true })

  const pathLeft = path

  return reducerFlow([
    // always delete current lexeme value as we don't want any lexeme value duplication after split
    deleteData({
      value,
    }),
    // set the thought's text to the left of the selection
    editThought({
      oldValue: value,
      newValue: valueLeft,
      context,
      path: simplePath,
    }),

    // create a new thought with the text to the right of the selection
    newThought({
      value: valueRight,
      at: pathLeft,
      // selection offset
      offset: 0,
      // must allow the cursor to be set since it is used as the destination for the children
      preventSetCursor: false,
    }),

    // move children
    state => {
      // we can safely assume that the cursor has been set to the newly created thought that contains valueRight
      const childNew = getThoughtById(state, head(state.cursor!))
      const pathRight = appendToPath(parentOf(simplePath), childNew.id)
      const children = getChildrenRanked(state, pathToContext(state, pathLeft))

      return reducerFlow(
        children.map((child, i) =>
          moveThought({
            oldPath: appendToPath(pathLeft, child.id),
            newPath: appendToPath(pathRight, child.id),
            newRank: i,
          }),
        ),
      )(state)
    },

    // render
    editableRender,
  ])(state)
}

export default _.curryRight(splitThought)
