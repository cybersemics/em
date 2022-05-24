import { Context, State } from '../@types'
import { isFunction } from '../util'
import _ from 'lodash'

/**
 * Checks if all ancestors of a context is visible.
 */
const isAncestorsVisible = _.curry((state: State, context: Context) => {
  return (
    state.showHiddenThoughts ||
    (!context.some(isFunction) &&
      // check if some ancestor have hidden attribute
      !context.some((value, index) => {
        // const currentContext = context.slice(0, index + 1)

        // temporarily disable =hidden for performance
        return isFunction(value)
        // if (isFunction(value)) return true
        // const thoughtId = contextToThoughtId(state, currentContext)
        // return thoughtId && hasChild(state, thoughtId, '=hidden')
      }))
  )
})

export default isAncestorsVisible
