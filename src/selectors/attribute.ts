import { Context, Path } from '../types'

// util
import {
  getThoughts,
  pathToContext,
} from '../util'

/** Returns the value of an attributee of the given context */
// eslint-disable-next-line no-unused-variables
const attribute = ({ contextIndex, thoughtIndex }: any, pathOrContext: Path|Context, attributeName: string) => {
  const children = getThoughts(pathToContext(pathOrContext).concat(attributeName), thoughtIndex, contextIndex)
  const hasAttribute = pathToContext(getThoughts(pathToContext(pathOrContext), thoughtIndex, contextIndex)).includes(attributeName)

  // differentiate between no attribute (return undefined) and an attribute with no children (return null)
  return !hasAttribute ? undefined
    : children.length > 0 ? children[0].value
    : null
}

export default attribute
