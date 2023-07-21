import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { EM_TOKEN, HOME_TOKEN } from '../constants'
import { getAllChildren } from '../selectors/getChildren'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import isRoot from '../util/isRoot'
import getContexts from './getContexts'
import getRootPath from './getRootPath'
import getThoughtById from './getThoughtById'
import isContextViewActive from './isContextViewActive'
import simplifyPath from './simplifyPath'

/** DEPRECATED: Converts a Context to a Path. This is a lossy function! If there is a duplicate thought in the same context, it takes the first. Works with cyclic Paths. Should be converted to a test-helper only. */
const contextToPath = (state: State, context: string[]): SimplePath | null => {
  if (isRoot(context)) return getRootPath(state)

  if (context.length > 1 && context[0] === HOME_TOKEN) {
    throw new Error(`Invalid Path. ${HOME_TOKEN} should be omitted from non-root contexts: ${context}`)
  }

  // Also supports thoughts starting from em context
  const isEmContext = context[0] === EM_TOKEN

  const startingThoughtId = isEmContext ? EM_TOKEN : HOME_TOKEN
  const contextUnrooted = context.slice(isEmContext ? 1 : 0)

  try {
    const path = contextUnrooted.reduce<Path>(
      (acc, value, i) => {
        const simplePathAccum = simplifyPath(state, acc)
        const prevParentId: ThoughtId = head(simplePathAccum) || startingThoughtId
        const showContexts = prevParentId && isContextViewActive(state, acc)
        const prevParent = showContexts && prevParentId ? getThoughtById(state, prevParentId) : null
        const childIds = prevParent ? getContexts(state, prevParent.value) : getAllChildren(state, prevParentId)
        const firstChildId =
          childIds.find(childId => {
            const child = getThoughtById(state, childId)
            return (showContexts ? getThoughtById(state, child.parentId)?.value : child.value) === value
          }) || null

        if (!firstChildId) throw Error('Thought not found')

        const isEm = i === 0 && value === EM_TOKEN

        return appendToPath(
          acc,
          isEm ? EM_TOKEN : showContexts ? getThoughtById(state, firstChildId).parentId : firstChildId,
        )
      },
      [] as any as Path,
    )
    // TODO: return Path
    return path as SimplePath
  } catch (e) {
    return null
  }
}

export default contextToPath
