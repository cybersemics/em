import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import attribute from './attribute'
import findDescendant from './findDescendant'

// pin state map
const pinStateMap = { false: false, true: true }

/** Returns true if a thought is pinned with =pin/true or =pin, false if =pin/false, and null if not pinned. */
const isPinned = (state: State, id: ThoughtId | null): boolean | null => {
  const hasPinAttribute = findDescendant(state, id, '=pin')
  const pinState = attribute(state, id, '=pin') as keyof typeof pinStateMap

  // Handle case =pin
  if (hasPinAttribute && pinState == null) return true

  return pinStateMap[pinState] ?? null
}

export default isPinned
