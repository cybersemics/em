import { store } from '../store.js'

// util
import {
  contextOf,
  getPrevRank,
  getThoughts,
  headRank,
  pathToContext,
  rootedContextOf,
  unroot,
} from '../util.js'

import { subCategorizeOne } from '../action-creators/subCategorizeOne'
import newThoughtSubmit from '../action-creators/newThoughtSubmit'

export default {
  id: 'bumpThought',
  name: 'Bump Thought Down',
  description: 'Bump the current thought down to its children and replace with empty text.',
  gesture: 'rld',
  exec: () => {
    const { cursor } = store.getState()
    const editable = document.querySelector('.editing .editable')

    // presumably if one of these is true then both are
    if (cursor && editable) {
      const value = editable.innerHTML
      const rank = headRank(cursor)
      const subthoughts = getThoughts(cursor)

      if (subthoughts.length > 0) {
        // TODO: Resolve thoughtsRanked to make it work within the context view
        // Cannot do this without the contextChain
        // Need to store the full thoughtsRanked of each cursor segment in the cursor
        const context = pathToContext(cursor)
        const rankNew = getPrevRank(cursor)

        store.dispatch({
          type: 'existingThoughtChange',
          oldValue: value,
          newValue: '',
          context: rootedContextOf(context),
          rankInContext: rankNew,
          thoughtsRanked: cursor
        })

        store.dispatch(newThoughtSubmit({
          context: unroot(contextOf(context).concat('')),
          rank: rankNew,
          value,
        }))

        store.dispatch({
          type: 'setCursor',
          thoughtsRanked: unroot(contextOf(cursor).concat({
            value: '',
            rank
          })),
        })
      }
      else {
        store.dispatch(subCategorizeOne({ thoughtsRanked: cursor }))
      }
    }
  }
}
