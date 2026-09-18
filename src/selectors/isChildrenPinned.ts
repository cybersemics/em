import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import findDescendant from './findDescendant'
import isPinned from './isPinned'

/** Returns true if a thought's children are pinned with =children/=pin/true or =children/=pin, false if =children/=pin/false, and null if not pinned. */
const isChildrenPinned = (state: State, id: ThoughtId | null): boolean | null =>
  isPinned(state, findDescendant(state, id, '=children'))

export default isChildrenPinned
