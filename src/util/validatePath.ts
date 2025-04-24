import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import getThoughtById from '../selectors/getThoughtById'

/** Checks if a path is valid by verifying each thought exists and maintains proper parent-child relationships.*/
const validatePath = (state: State, path: ThoughtId[] | null | undefined): boolean => {
  if (!path || path.length === 0) return false

  // Check if first thought exists
  const firstThought = getThoughtById(state, path[0])
  if (!firstThought) return false

  // For paths with multiple thoughts, validate each parent-child relationship
  return (
    path.length === 1 ||
    path.slice(1).every((childId, i) => {
      const parentId = path[i]
      const parent = getThoughtById(state, parentId)

      // Check if parent exists and has the child in its childrenMap
      return parent && !!parent.childrenMap[childId] && !!getThoughtById(state, childId)
    })
  )
}

export default validatePath
