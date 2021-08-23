import { unroot } from '../util'
import { isChildVisible } from '../selectors'
import { Context, State } from '../@types'
import { getAllChildrenAsThoughts } from './getChildren'

/** Returns the value of an attribute of the given context. O(children). Use attributeEquals for O(1) attribute equality check. Use a combination of hasChild and attribute to check if an attribute exists but has no children. */
const attribute = (state: State, context: Context, attributeName: string) => {
  const children = getAllChildrenAsThoughts(state, [...unroot(context), attributeName])
  const firstVisibleChild = children.find(isChildVisible(state, context))
  return firstVisibleChild ? firstVisibleChild.value : null
}

export default attribute
