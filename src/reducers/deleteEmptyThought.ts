import { HOME_TOKEN } from '../constants'
import {
  appendToPath,
  head,
  headRank,
  headValue,
  isDivider,
  isThoughtArchived,
  parentOf,
  pathToContext,
  reducerFlow,
} from '../util'
import {
  getNextRank,
  getChildren,
  getChildrenRanked,
  getAllChildren,
  isContextViewActive,
  prevSibling,
  simplifyPath,
  rootedParentOf,
} from '../selectors'
import { deleteThoughtWithCursor, editThought, deleteThought, moveThought, setCursor } from '../reducers'
import getTextContentFromHTML from '../device/getTextContentFromHTML'
import { SimplePath, State } from '../@types'
import archiveThought from './archiveThought'

/** Deletes an empty thought or merges two siblings if deleting from the beginning of a thought. */
const deleteEmptyThought = (state: State): State => {
  const { cursor, editing } = state

  if (!cursor) return state

  const offset = state.cursorOffset ?? 0
  const showContexts = isContextViewActive(state, pathToContext(parentOf(cursor)))
  const context = pathToContext(cursor)
  const simplePath = simplifyPath(state, cursor)
  const allChildren = getChildrenRanked(state, context)
  const visibleChildren = getChildren(state, context)
  const isEmpty = headValue(cursor) === '' || state.cursorCleared

  // delete an empty thought with no children
  if ((isEmpty && allChildren.length === 0) || isDivider(headValue(cursor))) {
    return deleteThoughtWithCursor(state, {})
  }
  // archive an empty thought with only hidden children
  else if (isEmpty && visibleChildren.length === 0) {
    return reducerFlow([
      // archive all children
      // if a child is already archived, move it to the parent
      // https://github.com/cybersemics/em/issues/864
      // https://github.com/cybersemics/em/issues/1282
      ...allChildren.map(child => {
        return !isThoughtArchived([...cursor, child])
          ? archiveThought({ path: [...cursor, child] })
          : moveThought({
              oldPath: [...cursor, child],
              newPath: [...parentOf(cursor), child],
            })
      }),

      // move the child archive up a level so it does not get permanently deleted
      state => {
        const childArchive = getAllChildren(state, context).find(child => child.value === '=archive')
        return childArchive
          ? moveThought(state, {
              oldPath: [...cursor, childArchive],
              newPath: [...parentOf(cursor), childArchive],
            })
          : state
      },

      // permanently delete the empty thought
      deleteThought({
        context: parentOf(context),
        thoughtRanked: head(cursor),
      }),
    ])(state)
  }
  // delete from beginning and merge with previous sibling
  else if (offset === 0 && !showContexts) {
    const value = headValue(cursor)
    const rank = headRank(cursor)
    const parentContext = context.length > 1 ? parentOf(context) : [HOME_TOKEN]
    const prev = prevSibling(state, value, pathToContext(rootedParentOf(state, cursor)), rank)

    // only if there is a previous sibling
    if (prev) {
      const valueNew = prev.value + value
      const pathPrevNew = appendToPath(parentOf(simplePath), {
        ...prev,
        value: valueNew,
      })

      return reducerFlow([
        // change first thought value to concatenated value
        editThought({
          oldValue: prev.value,
          newValue: valueNew,
          context: parentContext,
          path: parentOf(simplePath).concat(prev) as SimplePath,
        }),

        // merge children
        ...allChildren.map(
          (child, i) => (state: State) =>
            moveThought(state, {
              oldPath: appendToPath(simplePath, child),
              newPath: appendToPath(pathPrevNew, {
                ...child,
                rank: getNextRank(state, pathToContext(pathPrevNew)) + i,
              }),
            }),
        ),

        // delete second thought
        deleteThought({
          context: parentContext,
          thoughtRanked: head(simplePath),
        }),

        // move the cursor to the new thought at the correct offset
        setCursor({
          path: pathPrevNew,
          offset: getTextContentFromHTML(prev.value).length,
          editing,
        }),
      ])(state)
    }
  }

  return state
}

export default deleteEmptyThought
