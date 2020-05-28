// util
import {
  contextOf,
  headRank,
  isDocumentEditable,
  pathToContext,
  rootedContextOf,
  unroot,
} from '../util'

// selectors
import {
  getPrevRank,
  getThoughts,
  lastThoughtsFromContextChain,
  splitChain,
} from '../selectors'

export default {
  id: 'bumpThought',
  name: 'Bump Thought Down',
  description: 'Bump the current thought down to its children and replace with empty text.',
  gesture: 'rld',
  canExecute: () => isDocumentEditable(),
  exec: (dispatch, getState) => {
    const state = getState()
    const { cursor } = state
    const editable = document.querySelector('.editing .editable')

    // presumably if one of these is true then both are
    if (cursor && editable) {
      const value = editable.innerHTML
      const rank = headRank(cursor)
      const subthoughts = getThoughts(state, cursor)

      if (subthoughts.length > 0) {
        // TODO: Resolve thoughtsRanked to make it work within the context view
        // Cannot do this without the contextChain
        // Need to store the full thoughtsRanked of each cursor segment in the cursor
        const contextChain = splitChain(state, cursor)
        const thoughtsRanked = lastThoughtsFromContextChain(state, contextChain)
        const context = pathToContext(thoughtsRanked)
        const rankNew = getPrevRank(state, thoughtsRanked)

        dispatch({
          type: 'existingThoughtChange',
          oldValue: value,
          newValue: '',
          context: rootedContextOf(context),
          rankInContext: rankNew,
          thoughtsRanked
        })

        dispatch({
          type: 'newThoughtSubmit',
          context: unroot(contextOf(context).concat('')),
          rank: rankNew,
          value,
        })

        dispatch({
          type: 'setCursor',
          thoughtsRanked: unroot(contextOf(thoughtsRanked).concat({
            value: '',
            rank
          })),
        })
      }
      else {
        dispatch({ type: 'subCategorizeOne' })
      }
    }
  }
}
