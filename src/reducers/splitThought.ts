import _ from 'lodash'
import { HOME_TOKEN } from '../constants'
import { parentOf, headRank, headValue, pathToContext, reducerFlow, strip } from '../util'
import { getThoughtAfter, getChildrenRanked, simplifyPath } from '../selectors'
import { editableRender, editThought, moveThought, newThought, render } from '../reducers'
import { State } from '../util/initialState'
import { Path, SplitResult } from '../types'

/** Splits a thought into two thoughts.
 *
 * @param path     The path of the thought to split. Defaults to cursor.
 * @param offset   The index within the thought at which to split. Defaults to the browser selection offset.
 */
const splitThought = (state: State, { path, splitResult }: { path?: Path, splitResult: SplitResult }) => {

  path = path || state.cursor as Path

  const simplePath = simplifyPath(state, path)

  const thoughts = pathToContext(simplePath)
  const context = thoughts.length > 1 ? parentOf(thoughts) : [HOME_TOKEN]

  // split the value into left and right parts
  const value = headValue(path)

  const valueLeft = strip(splitResult.left, { preserveFormatting: true })
  const valueRight = strip(splitResult.right, { preserveFormatting: true })

  const pathLeft = parentOf(path).concat({ value: valueLeft, rank: headRank(path) })

  return reducerFlow([

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
      offset: 0
    }),

    // move children
    state => {
      const thoughtNew = getThoughtAfter(state, simplifyPath(state, pathLeft))
      const pathRight = parentOf(simplePath).concat({ value: valueRight, rank: thoughtNew!.rank })
      const children = getChildrenRanked(state, pathToContext(pathLeft))

      return reducerFlow(children.map(child =>
        moveThought({
          oldPath: pathLeft.concat(child),
          newPath: pathRight.concat(child)
        })
      ))(state)
    },

    // render
    render,
    editableRender
  ])(state)
}

export default _.curryRight(splitThought)
