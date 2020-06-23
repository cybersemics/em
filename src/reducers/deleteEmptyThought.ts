import { isMobile } from '../browser'
import { ROOT_TOKEN } from '../constants'
import { State } from '../util/initialState'

// util
import {
  asyncFocus,
  contextOf,
  head,
  headRank,
  headValue,
  isDivider,
  pathToContext,
  reducerFlow,
  rootedContextOf,
} from '../util'

// selectors
import {
  getNextRank,
  getThoughtsRanked,
  isContextViewActive,
  lastThoughtsFromContextChain,
  prevSibling,
  splitChain,
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
const deleteEmpytThought = (state: State) => {
  const { cursor, editing } = state
  const sel = window.getSelection()
  const offset = sel ? sel.focusOffset : 0

  if (cursor) {
    const showContexts = isContextViewActive(state, pathToContext(contextOf(cursor)))
    const contextChain = splitChain(state, cursor)
    const thoughtsRanked = lastThoughtsFromContextChain(state, contextChain)
    const children = getThoughtsRanked(state, thoughtsRanked)

    // delete an empty thought
    if ((headValue(cursor) === '' && children.length === 0) || isDivider(headValue(cursor))) {

      // SIDE EFFECT
      if (isMobile && state.editing) {
        asyncFocus()
      }

      return deleteThought(state)
    }
    // delete from beginning and merge
    else if (offset === 0 && !showContexts) {
      const value = headValue(cursor)
      const rank = headRank(cursor)
      const thoughts = pathToContext(thoughtsRanked)
      const context = thoughts.length > 1 ? contextOf(thoughts) : [ROOT_TOKEN]
      const prev = prevSibling(state, value, pathToContext(rootedContextOf(cursor)), rank)

      // only if there is a previous sibling
      if (prev) {

        const valueNew = prev.value + value
        const thoughtsRankedPrevNew = contextOf(thoughtsRanked).concat({
          value: valueNew,
          rank: prev.rank
        })

        return reducerFlow([

          // change first thought value to concatenated value
          // @ts-ignore
          state => existingThoughtChange(state, {
            oldValue: prev.value,
            newValue: valueNew,
            context,
            thoughtsRanked: contextOf(thoughtsRanked).concat(prev)
          }),

          // merge children
          ...children.map((child, i) =>
            // @ts-ignore
            state => existingThoughtMove(state, {
              oldPath: thoughtsRanked.concat(child),
              newPath: thoughtsRankedPrevNew.concat({ ...child, rank: getNextRank(state, pathToContext(thoughtsRankedPrevNew)) + i })
            })
          ),

          // delete second thought
          // @ts-ignore
          state => existingThoughtDelete(state, {
            context,
            thoughtRanked: head(thoughtsRanked)
          }),

          // move the cursor to the new thought at the correct offset
          // @ts-ignore
          state => setCursor(state, {
            thoughtsRanked: thoughtsRankedPrevNew,
            offset: prev.value.length,
            editing
          }),

        ])(state)
      }
    }
  }

  return state
}

export default deleteEmpytThought
