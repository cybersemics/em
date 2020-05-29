import { isMobile } from '../browser'

// constants
import {
  ROOT_TOKEN,
} from '../constants'

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
import deleteThought from './deleteThought'
import existingThoughtChange from './existingThoughtChange'
import existingThoughtMove from './existingThoughtMove'
import existingThoughtDelete from './existingThoughtDelete'
import setCursor from './setCursor'

/** Deletes an empty thought or merges two siblings if deleting from the beginning of a thought. */
export default state => {
  const { cursor, editing } = state
  const offset = window.getSelection().focusOffset

  if (cursor) {
    const showContexts = isContextViewActive(state, contextOf(cursor))
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
      const prev = prevSibling(state, value, rootedContextOf(cursor), rank)

      // only if there is a previous sibling
      if (prev) {

        const valueNew = prev.value + value
        const thoughtsRankedPrevNew = contextOf(thoughtsRanked).concat({
          value: valueNew,
          rank: prev.rank
        })

        return reducerFlow([

          // change first thought value to concatenated value
          state => existingThoughtChange(state, {
            oldValue: prev.value,
            newValue: valueNew,
            context,
            thoughtsRanked: contextOf(thoughtsRanked).concat(prev)
          }),

          // merge children
          ...children.map((child, i) =>
            state => existingThoughtMove(state, {
              oldPath: thoughtsRanked.concat(child),
              newPath: thoughtsRankedPrevNew.concat({ ...child, rank: getNextRank(state, thoughtsRankedPrevNew) + i })
            })
          ),

          // delete second thought
          state => existingThoughtDelete(state, {
            context,
            thoughtRanked: head(thoughtsRanked)
          }),

          // move the cursor to the new thought at the correct offset
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
