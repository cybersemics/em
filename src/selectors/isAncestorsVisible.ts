import _ from 'lodash'
import Context from '../@types/Context'
import State from '../@types/State'
import isAttribute from '../util/isAttribute'

/**
 * Checks if all ancestors of a context is visible.
 */
const isAncestorsVisible = _.curry((state: State, context: Context) => {
  return (
    state.showHiddenThoughts ||
    (!context.some(isAttribute) &&
      // check if some ancestor have hidden attribute
      !context.some((value, index) => {
        // const currentContext = context.slice(0, index + 1)

        // temporarily disable =hidden for performance
        return isAttribute(value)
        // if (isAttribute(value)) return true
        // const thoughtId = contextToThoughtId(state, currentContext)
        // return thoughtId && findDescendant(state, thoughtId, '=hidden')
      }))
  )
})

export default isAncestorsVisible
