import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import isAttribute from '../util/isAttribute'
import { getChildrenRanked } from './getChildren'

/** Places a first child after leading hidden attributes unless they are visible or explicitly bypassed. */
const getFirstChildPlacement = (state: State, id: ThoughtId, { aboveMeta }: { aboveMeta?: boolean } = {}) => {
  if (aboveMeta || state.showHiddenThoughts) return null
  const children = getChildrenRanked(state, id)
  const firstVisible = children.findIndex(child => !isAttribute(child.value))
  return (firstVisible === -1 ? children.at(-1) : children[firstVisible - 1])?.id ?? null
}

export default getFirstChildPlacement
