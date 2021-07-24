import _ from 'lodash'
import { HOME_TOKEN } from '../constants'
import {
  appendToPath,
  parentOf,
  hashContext,
  headRank,
  headValue,
  pathToContext,
  reducerFlow,
  strip,
  headId,
} from '../util'
import { getThoughtAfter, getChildrenRanked, simplifyPath } from '../selectors'
import { editableRender, editThought, moveThought, newThought } from '../reducers'
import { Path, SplitResult, State } from '../@types'

/** Splits a thought into two thoughts.
 *
 * @param path     The path of the thought to split. Defaults to cursor.
 * @param offset   The index within the thought at which to split. Defaults to the browser selection offset.
 */
const splitThought = (state: State, { path, splitResult }: { path?: Path; splitResult: SplitResult }) => {
  path = path || (state.cursor as Path)

  const simplePath = simplifyPath(state, path)

  const thoughts = pathToContext(simplePath)
  const context = thoughts.length > 1 ? parentOf(thoughts) : [HOME_TOKEN]

  // split the value into left and right parts
  const value = headValue(path)

  const valueLeft = strip(splitResult.left, { preserveFormatting: true })
  const valueRight = strip(splitResult.right, { preserveFormatting: true })

  const pathLeft = appendToPath(parentOf(path), {
    id: headId(path),
    value: valueLeft,
    rank: headRank(path),
  })

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
      offset: 0,
    }),

    // move children
    state => {
      const childNew = getThoughtAfter(state, simplifyPath(state, pathLeft))
      const pathRight = appendToPath(parentOf(simplePath), {
        // @MIGRATION_NOTE: The id needs to be same as the newly created thought id. Should we pass optional id to newThought ??
        id: hashContext(state, [...pathToContext(parentOf(simplePath)), valueRight]) || '',
        value: valueRight,
        rank: childNew!.rank,
      })
      const children = getChildrenRanked(state, pathToContext(pathLeft))

      return reducerFlow(
        children.map(child =>
          moveThought({
            oldPath: appendToPath(pathLeft, child),
            newPath: appendToPath(pathRight, child),
          }),
        ),
      )(state)
    },

    // render
    editableRender,
  ])(state)
}

export default _.curryRight(splitThought)
