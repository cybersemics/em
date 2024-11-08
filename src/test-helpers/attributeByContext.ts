import Context from '../@types/Context'
import State from '../@types/State'
import attribute from '../selectors/attribute'
import contextToThoughtId from '../selectors/contextToThoughtId'

/** Gets the value of an attribute by Context. */
const attributeByContext = (state: State, context: Context, attributeName: string) => {
  const id = contextToThoughtId(state, context)
  return id && attribute(state, id, attributeName)
}

export default attributeByContext
