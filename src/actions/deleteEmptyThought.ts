import State from '../@types/State'
import Thunk from '../@types/Thunk'
import deleteThought from '../actions/deleteThought'
import deleteThoughtWithCursor from '../actions/deleteThoughtWithCursor'
import editThought from '../actions/editThought'
import moveThought from '../actions/moveThought'
import setCursor from '../actions/setCursor'
import getTextContentFromHTML from '../device/getTextContentFromHTML'
import findDescendant from '../selectors/findDescendant'
import { findAnyChild, getChildren, getChildrenRanked, hasChildren } from '../selectors/getChildren'
import getNextRank from '../selectors/getNextRank'
import getThoughtBefore from '../selectors/getThoughtBefore'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import prevSibling from '../selectors/prevSibling'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import appendToPath from '../util/appendToPath'
import ellipsize from '../util/ellipsize'
import head from '../util/head'
import headValue from '../util/headValue'
import isDivider from '../util/isDivider'
import isThoughtArchived from '../util/isThoughtArchived'
import parentOf from '../util/parentOf'
import pathToContext from '../util/pathToContext'
import reducerFlow from '../util/reducerFlow'
import archiveThought from './archiveThought'
import { errorActionCreator as error } from './error'

/** Deletes an empty thought or merges two siblings if deleting from the beginning of a thought. */
const deleteEmptyThought = (state: State): State => {
  const { cursor, editing } = state

  if (!cursor) return state

  const cursorThought = getThoughtById(state, head(cursor))
  const { value } = cursorThought

  const offset = state.cursorOffset ?? 0
  const showContexts = isContextViewActive(state, rootedParentOf(state, cursor))
  const simplePath = simplifyPath(state, cursor)
  const allChildren = getChildrenRanked(state, head(cursor))
  const visibleChildren = getChildren(state, head(cursor))
  const isEmpty = headValue(state, cursor) === '' || state.cursorCleared

  // delete an empty thought with no children
  // or delete an empty context with an only-child and no grandchildren
  // e.g. delete a/m~/_ if ABS/_ has no other children (besides m) and ABS/_/m has no children
  if (
    (isEmpty || isDivider(value)) &&
    (showContexts ? allChildren.length === 1 && !hasChildren(state, allChildren[0].id) : allChildren.length === 0)
  ) {
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
        const childArchive = findAnyChild(state, head(cursor), child => child.value === '=archive')
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
        pathParent: parentOf(cursor),
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
    const { value, splitSource } = cursorThought
    const prev = prevSibling(state, cursor)

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
          pathParent: rootedParentOf(state, cursor),
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

/** Action-creator for deleteEmptyThought. */
export const deleteEmptyThoughtActionCreator: Thunk = (dispatch, getState) => {
  const state = getState()
  const { cursor } = state
  if (!cursor) return

  const simplePath = simplifyPath(state, cursor)
  const prevThought = getThoughtBefore(state, simplePath)
  // Determine if thought at cursor is uneditable
  const contextOfCursor = pathToContext(state, cursor)
  const uneditable = contextOfCursor && findDescendant(state, head(cursor), '=uneditable')

  if (prevThought && uneditable) {
    dispatch(error({ value: `'${ellipsize(headValue(state, cursor))}' is uneditable and cannot be merged.` }))
    return
  }

  dispatch({ type: 'deleteEmptyThought' })
}

export default deleteEmptyThought
