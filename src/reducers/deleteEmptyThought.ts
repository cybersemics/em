import { isMobile } from '../browser'
import { ROOT_TOKEN } from '../constants'
import { State } from '../util/initialState'
import { SimplePath } from '../types'

// util
import {
  asyncFocus,
  head,
  headRank,
  headValue,
  isDivider,
  parentOf,
  pathToContext,
  reducerFlow,
  rootedParentOf,
} from '../util'

// selectors
import {
  getNextRank,
  getThoughtsRanked,
  isContextViewActive,
  prevSibling,
  simplifyPath,
} from '../selectors'

// reducers
import {
  deleteThought,
  existingThoughtChange,
  existingThoughtDelete,
  existingThoughtMove,
  setCursor,
} from '../reducers'

/** Deletes an empty thought or merges two siblings if deleting from the beginning of a thought. */
const deleteEmptyThought = (state: State) => {
  const { cursor, editing } = state
  const sel = window.getSelection()
  const offset = sel ? sel.focusOffset : 0

  if (!cursor) return

  const showContexts = isContextViewActive(state, pathToContext(parentOf(cursor)))
  const path = simplifyPath(state, cursor)
  const children = getThoughtsRanked(state, pathToContext(path))

  // delete an empty thought
  if ((headValue(cursor) === '' && children.length === 0) || isDivider(headValue(cursor))) {

    // SIDE EFFECT
    if (isMobile && state.editing) {
      asyncFocus()
    }

    return deleteThought(state, {})
  }
  // delete from beginning and merge
  else if (offset === 0 && sel?.isCollapsed && !showContexts) {
    const value = headValue(cursor)
    const rank = headRank(cursor)
    const thoughts = pathToContext(path)
    const context = thoughts.length > 1 ? parentOf(thoughts) : [ROOT_TOKEN]
    const prev = prevSibling(state, value, pathToContext(rootedParentOf(cursor)), rank)

    // only if there is a previous sibling
    if (prev) {

      const valueNew = prev.value + value
      const thoughtsRankedPrevNew = parentOf(path).concat({
        value: valueNew,
        rank: prev.rank
      })

      return reducerFlow([

        // change first thought value to concatenated value
        existingThoughtChange({
          oldValue: prev.value,
          newValue: valueNew,
          context,
          path: parentOf(path).concat(prev) as SimplePath
        }),

        // merge children
        ...children.map((child, i) =>
          (state: State) => existingThoughtMove(state, {
            oldPath: path.concat(child),
            newPath: thoughtsRankedPrevNew.concat({ ...child, rank: getNextRank(state, pathToContext(thoughtsRankedPrevNew)) + i })
          })
        ),

        // delete second thought
        existingThoughtDelete({
          context,
          thoughtRanked: head(path)
        }),

        // move the cursor to the new thought at the correct offset
        setCursor({
          path: thoughtsRankedPrevNew,
          offset: prev.value.length,
          editing
        }),

      ])(state)
    }
  }

  return state
}

export default deleteEmptyThought
