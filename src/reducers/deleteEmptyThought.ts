import { HOME_TOKEN } from '../constants'
import {
  appendToPath,
  head,
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
  isContextViewActive,
  prevSibling,
  simplifyPath,
  rootedParentOf,
  getThoughtById,
} from '../selectors'
import { deleteThoughtWithCursor, editThought, deleteThought, moveThought, setCursor } from '../reducers'
import getTextContentFromHTML from '../device/getTextContentFromHTML'
import { State } from '../@types'
import archiveThought from './archiveThought'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'

/** Deletes an empty thought or merges two siblings if deleting from the beginning of a thought. */
const deleteEmptyThought = (state: State): State => {
  const { cursor, editing } = state

  if (!cursor) return state

  const cursorThought = getThoughtById(state, head(cursor))
  const { value } = cursorThought

  const offset = state.cursorOffset ?? 0
  const showContexts = isContextViewActive(state, pathToContext(state, parentOf(cursor)))
  const context = pathToContext(state, cursor)
  const simplePath = simplifyPath(state, cursor)
  const allChildren = getChildrenRanked(state, head(cursor))
  const visibleChildren = getChildren(state, context)
  const isEmpty = headValue(state, cursor) === '' || state.cursorCleared

  // delete an empty thought with no children
  if ((isEmpty && allChildren.length === 0) || isDivider(value)) {
    return deleteThoughtWithCursor(state, {})
  }
  // archive an empty thought with only hidden children
  else if (isEmpty && visibleChildren.length === 0) {
    return reducerFlow([
      // archive all children
      // if a child is already archived, move it to the parent
      // https://github.com/cybersemics/em/issues/864
      // https://github.com/cybersemics/em/issues/1282
      // Note: Move the achieved child up a level all at once in the next step.
      ...allChildren.map(child => {
        return !isThoughtArchived(state, [...cursor, child.id]) ? archiveThought({ path: [...cursor, child.id] }) : null
      }),
      // move the child archive up a level so it does not get permanently deleted
      state => {
        const childArchive = getAllChildrenAsThoughts(state, context).find(child => child.value === '=archive')
        return childArchive
          ? moveThought(state, {
              oldPath: [...cursor, childArchive.id],
              newPath: [...parentOf(cursor), childArchive.id],
              newRank: childArchive.rank,
            })
          : state
      },
      // permanently delete the empty thought
      deleteThought({
        context: parentOf(context),
        thoughtId: head(cursor),
      }),
      // @MIGRATION-TODO: Set proper cursor here
      setCursor({
        path: null,
      }),
    ])(state)
  }
  // delete from beginning and merge with previous sibling
  else if (offset === 0 && !showContexts) {
    const { value, rank, splitSource } = cursorThought
    const parentContext = context.length > 1 ? parentOf(context) : [HOME_TOKEN]
    const prev = prevSibling(state, value, pathToContext(state, rootedParentOf(state, cursor)), rank)

    // only if there is a previous sibling
    if (prev) {
      // if splitSource equals prev sibling thought id, then add an intervening space to preserve the original space while splitting from the source thought
      const valueNew = splitSource === prev.id ? prev.value + ' ' + value : prev.value + value
      const pathPrevNew = appendToPath(parentOf(simplePath), prev.id)

      return reducerFlow([
        // change first thought value to concatenated value
        editThought({
          oldValue: prev.value,
          newValue: valueNew,
          context: parentContext,
          path: pathPrevNew,
        }),

        // merge children
        ...allChildren.map(
          (child, i) => (state: State) =>
            moveThought(state, {
              oldPath: appendToPath(simplePath, child.id),
              newPath: appendToPath(pathPrevNew, child.id),
              newRank: getNextRank(state, head(pathPrevNew)) + i,
            }),
        ),

        // delete second thought
        deleteThought({
          context: parentContext,
          thoughtId: head(simplePath),
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
