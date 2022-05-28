import { Context, State } from '../@types'
import { attribute, contextToThoughtId } from '../selectors'

/** Gets the value of an attribute by Context. */
const attributeByContext = (state: State, context: Context, attributeName: string) => {
  const id = contextToThoughtId(state, context)
  return id && attribute(state, id, attributeName)
}

export default attributeByContext
