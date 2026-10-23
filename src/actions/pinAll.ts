import State from '../@types/State'
import Thunk from '../@types/Thunk'
import findDescendant from '../selectors/findDescendant'
import { findAnyChild, getAllChildren } from '../selectors/getChildren'
import isChildrenPinned from '../selectors/isChildrenPinned'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import isRoot from '../util/isRoot'
import reducerFlow from '../util/reducerFlow'
import deleteAttribute from './deleteAttribute'
import setDescendant from './setDescendant'
import toggleAttribute from './toggleAttribute'

/** Pins or unpins all thoughts at the current level by toggling =children/=pin on the cursor's parent. */
const pinAll = (state: State): State => {
  const { cursor } = state
  if (!cursor || isRoot(cursor)) return state

  const simplePath = simplifyPath(state, rootedParentOf(state, cursor))
  const thoughtId = head(simplePath)
  const childrenAttributeId = findDescendant(state, thoughtId, '=children')
  const childrenPinAttributeId = findDescendant(state, childrenAttributeId, '=pin')

  // whether =children holds attributes other than =pin, and thus must be preserved when unpinning
  const hasNonPinChildrenAttribute =
    !!childrenAttributeId && !!findAnyChild(state, childrenAttributeId, child => child.value !== '=pin')

  // If =children already exists with other attributes but no =pin, set =pin on it in place rather than
  // recreating =children, which would discard the other attributes.
  if (childrenAttributeId && !childrenPinAttributeId && hasNonPinChildrenAttribute) {
    return toggleAttribute(state, {
      path: appendToPath(simplePath, childrenAttributeId),
      values: ['=pin', 'true'],
    })
  }

  return isChildrenPinned(state, thoughtId) && childrenAttributeId
    ? reducerFlow([
        // unpin all subthoughts, preserving any other =children attributes
        deleteAttribute({ path: appendToPath(simplePath, childrenAttributeId), value: '=pin' }),
        // delete =children if =pin was its only child
        hasNonPinChildrenAttribute ? null : deleteAttribute({ path: simplePath, value: '=children' }),
      ])(state)
    : reducerFlow([
        // remove =pin/false from all subthoughts so that none opt out of the pin
        ...getAllChildren(state, thoughtId).map(childId =>
          deleteAttribute({ path: appendToPath(simplePath, childId), values: ['=pin', 'false'] }),
        ),
        setDescendant({ path: simplePath, values: ['=children', '=pin', 'true'] }),
      ])(state)
}

/** A Thunk that dispatches a 'pinAll' action. */
export const pinAllActionCreator = (): Thunk => dispatch => dispatch({ type: 'pinAll' })

export default pinAll

// Register this action's metadata
registerActionMetadata('pinAll', {
  undoable: true,
})
