// eslint-disable-next-line no-unused-vars
import { Child, Context, Path } from '../types'
import { isFunction, pathToContext } from '../util'
import { getThoughts, hasChild } from '../selectors'

/** Returns the value of an attribute of the given context. O(children). Use attributeEquals for O(1) attribute equality check. Use a combination of hasChild and attribute to check if an attribute exists but has no children. */
const attribute = (state: any, pathOrContext: Path|Context, attributeName: string) => {

  const context = pathToContext(pathOrContext)
  const children = getThoughts(state, [...context, attributeName])

  /**
   *
   */
  const notHidden = (child: Child) => !isFunction(child.value) && !hasChild(state, [...context, child.value], '=hidden')
  const firstVisibleChild = children.find(notHidden)

  // differentiate between no attribute (return undefined) and an attribute with no children (return null)
  return firstVisibleChild ? firstVisibleChild.value : null
}

export default attribute
