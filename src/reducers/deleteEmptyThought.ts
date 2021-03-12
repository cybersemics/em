import { HOME_TOKEN } from '../constants'
import { head, headRank, headValue, isDivider, parentOf, pathToContext, reducerFlow } from '../util'
import { getNextRank, getChildren, getChildrenRanked, isContextViewActive, prevSibling, simplifyPath, rootedParentOf } from '../selectors'
import { deleteThought, existingThoughtChange, existingThoughtDelete, existingThoughtMove, setCursor } from '../reducers'
import { State } from '../util/initialState'
import { SimplePath } from '../types'
import archiveThought from './archiveThought'

/** Deletes an empty thought or merges two siblings if deleting from the beginning of a thought. */
const deleteEmptyThought = (state: State): State => {
  const { cursor, editing } = state
  const sel = window.getSelection()
  const offset = sel ? sel.focusOffset : 0

  if (!cursor) return state

  const showContexts = isContextViewActive(state, pathToContext(parentOf(cursor)))
  const context = pathToContext(cursor)
  const simplePath = simplifyPath(state, cursor)
  const allChildren = getChildrenRanked(state, context)
  const visibleChildren = getChildren(state, context)
  // check innerHTML in case the user just executed clearThought, which yields an empty thought in the DOM but not in state
  const isDomEmpty = document.querySelector('.editing .editable')?.innerHTML === ''
  const isEmpty = headValue(cursor) === '' || isDomEmpty

  // delete an empty thought with no children
  if ((isEmpty && allChildren.length === 0) || isDivider(headValue(cursor))) {
    return deleteThought(state, {})
  }
  // archive an empty thought with hidden children
  else if (isEmpty && visibleChildren.length === 0) {
    return reducerFlow([
      ...allChildren.map(child => archiveThought({ path: [...cursor, child] })),
      state => {
        const archivedChild = getChildrenRanked(state, context)[0]
        return existingThoughtMove(state, { oldPath: [...cursor, archivedChild], newPath: [...parentOf(cursor), archivedChild] })
      },
      state => existingThoughtDelete(state, {
        context: parentOf(context),
        thoughtRanked: head(cursor)
      })
    ])(state)
  }
  // delete from beginning and merge with previous sibling
  else if (offset === 0 && sel?.isCollapsed && !showContexts) {
    const value = headValue(cursor)
    const rank = headRank(cursor)
    const parentContext = context.length > 1 ? parentOf(context) : [HOME_TOKEN]
    const prev = prevSibling(state, value, pathToContext(rootedParentOf(state, cursor)), rank)

    // only if there is a previous sibling
    if (prev) {

      const valueNew = prev.value + value
      const pathPrevNew = [
        ...parentOf(simplePath),
        {
          ...prev,
          value: valueNew,
        }
      ]

      return reducerFlow([

        // change first thought value to concatenated value
        existingThoughtChange({
          oldValue: prev.value,
          newValue: valueNew,
          context: parentContext,
          path: parentOf(simplePath).concat(prev) as SimplePath
        }),

        // merge children
        ...allChildren.map((child, i) =>
          (state: State) => existingThoughtMove(state, {
            oldPath: simplePath.concat(child),
            newPath: pathPrevNew.concat({ ...child, rank: getNextRank(state, pathToContext(pathPrevNew)) + i })
          })
        ),

        // delete second thought
        existingThoughtDelete({
          context: parentContext,
          thoughtRanked: head(simplePath)
        }),

        // move the cursor to the new thought at the correct offset
        setCursor({
          path: pathPrevNew,
          offset: prev.value.length,
          editing
        }),

      ])(state)
    }
  }

  return state
}

export default deleteEmptyThought
