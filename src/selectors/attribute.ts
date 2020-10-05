// eslint-disable-next-line no-unused-vars
import { Context, Path } from '../types'
import { pathToContext, unroot } from '../util'
import { getThoughts, isChildVisible } from '../selectors'
import { State } from '../util/initialState'

/** Returns the value of an attribute of the given context. O(children). Use attributeEquals for O(1) attribute equality check. Use a combination of hasChild and attribute to check if an attribute exists but has no children. */
const attribute = (state: State, pathOrContext: Path|Context, attributeName: string) => {
  const context = pathToContext(pathOrContext)
  const children = getThoughts(state, [...unroot(context), attributeName])
  const firstVisibleChild = children.find(isChildVisible(state, context))
  return firstVisibleChild ? firstVisibleChild.value : null
}

export default attribute
