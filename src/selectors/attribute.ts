import { Context, Path } from '../types'

// util
import {
  pathToContext,
} from '../util'

// selectors
import getThoughts from '../selectors/getThoughts'

/** Returns the value of an attributee of the given context */
const attribute = (state: any, pathOrContext: Path|Context, attributeName: string) => {
  const children = getThoughts(state, pathToContext(pathOrContext).concat(attributeName))
  const hasAttribute = pathToContext(getThoughts(state, pathToContext(pathOrContext))).includes(attributeName)

  // differentiate between no attribute (return undefined) and an attribute with no children (return null)
  return !hasAttribute ? undefined
    : children.length > 0 ? children[0].value
      : null
}

export default attribute
