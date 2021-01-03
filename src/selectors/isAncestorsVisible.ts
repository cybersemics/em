import { Context } from '../types'
import { isFunction } from '../util'
import { State } from '../util/initialState'
import _ from 'lodash'
import hasChild from './hasChild'

/**
 * Checks if all ancestors of a context is visible.
 */
const isAncestorsVisible = _.curry((state: State, context: Context) => {
  return state.showHiddenThoughts ||
  (
    !context.some(isFunction) &&
    // check if some ancestor have hidden attribute
    !context.some((value, index) => {
      const currentContext = context.slice(0, index + 1)
      return isFunction(value) || hasChild(state, currentContext, '=hidden')
    }))
})

export default isAncestorsVisible
