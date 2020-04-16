import { store } from '../store.js'

// util
import {
  hashThought,
  headValue,
} from '../util'

// selectors
import { getThought } from '../selectors'

// action-creators
import syncRemote from '../action-creators/syncRemote'

import { updateThought } from '../db'

// SIDE EFFECTS: localStorage, syncRemote
export default (state, { thoughtsRanked, newValue }) => {

  const { thoughtIndex } = state
  const value = headValue(thoughtsRanked)
  const oldThought = getThought(state, value)
  const newThought = Object.assign({}, oldThought, {
    code: newValue
  })

  thoughtIndex[hashThought(value)] = newThought

  setTimeout(() => {
    updateThought(hashThought(value), newThought).catch(err => {
      throw new Error(err)
    })
    store.dispatch(syncRemote({
      [hashThought(value)]: newThought
    }, {}))
  })

  return {
    thoughtIndex: Object.assign({}, thoughtIndex)
  }
}
