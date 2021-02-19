import _ from 'lodash'
import xhtmlPurifier from 'xhtml-purifier'
import { HOME_TOKEN } from '../constants'
import { parentOf, headRank, headValue, pathToContext, reducerFlow, strip } from '../util'
import { getThoughtAfter, getChildrenRanked, simplifyPath } from '../selectors'
import { editableRender, existingThoughtChange, existingThoughtMove, newThought, render } from '../reducers'
import { State } from '../util/initialState'
import { Path } from '../types'

/** Splits a thought into two thoughts.
 *
 * @param path     The path of the thought to split. Defaults to cursor.
 * @param offset   The index within the thought at which to split. Defaults to the browser selection offset.
 */
const splitThought = (state: State, { path, offset }: { path?: Path, offset?: number }) => {

  path = path || state.cursor as Path
  offset = offset || window.getSelection()?.focusOffset

  const simplePath = simplifyPath(state, path)

  const thoughts = pathToContext(simplePath)
  const context = thoughts.length > 1 ? parentOf(thoughts) : [HOME_TOKEN]

  // split the value into left and right parts
  const value = headValue(path)

  /*
    Note: Splitting a value with formatting tags may cause splitted values to be dirty html string.
          So xhtmlPurifier takes badly formatted html, and returns a pretty printed valid XHTML string.
          Since xhtmlPurifier adds unwanted <p> tags too, so strip is used to remove such tags while preserving formatting tags.
          issue: https://github.com/cybersemics/em/issues/742
  */
  const valueLeft = strip(xhtmlPurifier.purify(value.slice(0, offset)), { preserveFormatting: true })
  const valueRight = strip(xhtmlPurifier.purify(value.slice(offset)), { preserveFormatting: true })
  const pathLeft = parentOf(path).concat({ value: valueLeft, rank: headRank(path) })

  return reducerFlow([

    // set the thought's text to the left of the selection
    existingThoughtChange({
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
        existingThoughtMove({
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
