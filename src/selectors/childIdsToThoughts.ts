import { Child, State } from '../@types'

/**
 *
 */
const childIdsToThoughts = (state: State, childIds: Child[]) =>
  childIds.map(id => {
    const thought = state.thoughts.contextIndex[id]
    return thought
  })

export default childIdsToThoughts
