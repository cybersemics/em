import { pathToContext } from '../util'
import { getThoughts } from '../selectors'
import { Context } from '../types'
import { InitialStateInterface } from '../util/initialState'

/** Returns true if the given context has an attribute. O(children). */
const hasAttribute = (state: InitialStateInterface, context: Context, attributeName: string) =>
  pathToContext(getThoughts(state, context)).includes(attributeName)

export default hasAttribute
