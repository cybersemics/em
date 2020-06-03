import { pathToContext } from '../util'
import { getThoughts } from '../selectors'
import { Context } from '../types'
import { State } from '../util/initialState'

/** Returns true if the given context has an attribute. O(children). */
const hasAttribute = (state: State, context: Context, attributeName: string) =>
  pathToContext(getThoughts(state, context)).includes(attributeName)

export default hasAttribute
