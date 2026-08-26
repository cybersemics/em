import Path from '../@types/Path'
import State from '../@types/State'
import { EM_TOKEN, HOME_TOKEN } from '../constants'
import { getAllChildren } from '../selectors/getChildren'
import appendToPath, { appendContextStep } from '../util/appendToPath'
import headId from '../util/headId'
import isRoot from '../util/isRoot'
import contextThoughtId from './contextThoughtId'
import getContexts from './getContexts'
import getRootPath from './getRootPath'
import getThoughtById from './getThoughtById'
import isContextViewActive from './isContextViewActive'

/** DEPRECATED: Converts a Context to a Path. This is a lossy function! If there is a duplicate thought in the same context, it takes the first. Crosses active context views, tagging the steps that do, so the result is a Path rather than a SimplePath. Should be converted to a test-helper only. */
const contextToPath = (state: State, context: string[]): Path | null => {
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
        const showContexts = acc.length > 0 && isContextViewActive(state, acc)
        // The context view lists the contexts of the thought the user sees, whereas ordinary children come from the
        // thought the path lands on — which inside a context view is the Lexeme instance, not the context. e.g. under
        // a/m~/b the child y is a child of b/m, not of b.
        const contextViewThought =
          showContexts && acc.length > 0 ? getThoughtById(state, contextThoughtId(state, acc)) : null
        const childIds = contextViewThought
          ? getContexts(state, contextViewThought.value)
          : getAllChildren(state, acc.length > 0 ? headId(acc) : startingThoughtId)
        const firstChildId =
          childIds.find(childId => {
            const child = getThoughtById(state, childId)
            if (!child) return false
            return (showContexts ? getThoughtById(state, child.parentId)?.value : child.value) === value
          }) || null

        if (!firstChildId) throw Error('Thought not found')
        const firstChild = getThoughtById(state, firstChildId)
        if (!firstChild) throw Error('Thought not found')

        const isEm = i === 0 && value === EM_TOKEN

        // In the context view the step records the Lexeme instance (firstChild), not the context it is displayed as.
        return isEm
          ? appendToPath(acc, EM_TOKEN)
          : showContexts
            ? appendContextStep(acc, firstChildId)
            : appendToPath(acc, firstChildId)
      },
      [] as unknown as Path,
    )
    return path
  } catch (e) {
    return null
  }
}

export default contextToPath
