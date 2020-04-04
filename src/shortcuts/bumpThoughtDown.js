import { store } from '../store'

// util
import {
  contextOf,
  getPrevRank,
  headRank,
  lastThoughtsFromContextChain,
  pathToContext,
  rootedContextOf,
  splitChain,
  unroot,
} from '../util'

// action-creators
import { subCategorizeOne } from '../action-creators/subCategorizeOne'

// selectors
import getThoughts from '../selectors/getThoughts'

export default {
  id: 'bumpThought',
  name: 'Bump Thought Down',
  description: 'Bump the current thought down to its children and replace with empty text.',
  gesture: 'rld',
  exec: () => {
    const state = store.getState()
    const { contextViews, cursor } = state
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
        const contextChain = splitChain(cursor, contextViews)
        const thoughtsRanked = lastThoughtsFromContextChain(contextChain)
        const context = pathToContext(thoughtsRanked)
        const rankNew = getPrevRank(state, thoughtsRanked)

        store.dispatch({
          type: 'existingThoughtChange',
          oldValue: value,
          newValue: '',
          context: rootedContextOf(context),
          rankInContext: rankNew,
          thoughtsRanked
        })

        store.dispatch({
          type: 'newThoughtSubmit',
          context: unroot(contextOf(context).concat('')),
          rank: rankNew,
          value,
        })

        store.dispatch({
          type: 'setCursor',
          thoughtsRanked: unroot(contextOf(thoughtsRanked).concat({
            value: '',
            rank
          })),
        })
      }
      else {
        store.dispatch(subCategorizeOne())
      }
    }
  }
}
