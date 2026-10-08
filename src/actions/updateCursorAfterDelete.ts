import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import cursorBack from '../actions/cursorBack'
import setCursor from '../actions/setCursor'
import getContexts from '../selectors/getContexts'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import nextContext from '../selectors/nextContext'
import nextSibling from '../selectors/nextSibling'
import prevContext from '../selectors/prevContext'
import prevSibling from '../selectors/prevSibling'
import rootedParentOf from '../selectors/rootedParentOf'
import thoughtToPath from '../selectors/thoughtToPath'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import headValue from '../util/headValue'
import parentOf from '../util/parentOf'

/** Captures cursor neighbors before deletion and returns a reducer that repairs the cursor afterward.
 * Sets the cursor on the next sibling, previous sibling, or parent, accounting for context views.
 * Deleting a newly created thought instead restores the cursor from before New Thought.
 */
const updateCursorAfterDelete = (state: State) => {
  const cursor = state.cursor
  if (!cursor) return null

  const parentPath = rootedParentOf(state, cursor)
  const showContexts = isContextViewActive(state, parentPath)
  const simplePath = thoughtToPath(state, head(cursor))
  const thought = getThoughtById(state, head(simplePath))
  if (!thought) return null

  const isEmpty = thought.value === ''
  const canReturnToParent = showContexts || simplePath.length > 1
  const parentThought = getThoughtById(state, head(parentPath))
  const numContexts = showContexts && parentThought ? getContexts(state, parentThought.value).length : 0
  const isCyclic = head(cursor) === head(parentOf(parentOf(cursor)))
  // A cyclic or second-to-last context collapses the view, so its context neighbors cannot receive the cursor.
  const closesContextView = isCyclic || numContexts <= 2
  const previousId = showContexts
    ? closesContextView
      ? undefined
      : prevContext(state, cursor)?.id
    : prevSibling(state, simplePath, { showContexts: false })?.id
  const nextId = showContexts
    ? closesContextView
      ? undefined
      : nextContext(state, cursor)?.id
    : nextSibling(state, simplePath)?.id

  /** Resolves surviving ancestors and caret text from the current document, using only captured cursor facts. */
  return (after: State, transaction?: ThoughtspaceTransaction) => {
    // Deleting from a cyclic context may also remove ancestors of the displayed cursor.
    const pathParent = rootedParentOf(after, cursor)
    const missingIndex = pathParent.findIndex(id => !getThoughtById(after, id))
    const closestAncestor = missingIndex !== -1 ? (pathParent.slice(0, missingIndex) as Path) : pathParent

    const lastPatches = after.undoPatches[after.undoPatches.length - 1]
    const lastCursorOp =
      lastPatches?.metadata.actionTypes[0] === 'newThought'
        ? lastPatches.ops.find(patch => patch.path === '/cursor')
        : undefined
    const revertedCursor = lastCursorOp && 'value' in lastCursorOp ? (lastCursorOp.value as Path | null) : null

    const cursorNew = revertedCursor
      ? revertedCursor
      : // Prefer the previous sibling for an empty thought, like a word processor.
        !isEmpty && nextId
        ? appendToPath(parentOf(cursor), nextId)
        : previousId || nextId
          ? appendToPath(closestAncestor, (previousId || nextId)!)
          : canReturnToParent
            ? closestAncestor
            : null

    return cursorNew
      ? setCursor(
          after,
          {
            path: cursorNew,
            isKeyboardOpen: after.isKeyboardOpen,
            // Fall back to the end of the previous thought; otherwise start at the beginning.
            offset: !nextId || (isEmpty && previousId) ? headValue(after, cursorNew)?.length : 0,
          },
          transaction,
        )
      : cursorBack(after, undefined, transaction)
  }
}

export default updateCursorAfterDelete
