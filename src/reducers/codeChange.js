// util
import {
  hashThought,
  headValue,
} from '../util'

// selectors
import { getThought, syncRemote } from '../selectors'

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
    syncRemote(state, {
      [hashThought(value)]: newThought
    }, {})
  })

  return {
    thoughtIndex: Object.assign({}, thoughtIndex)
  }
}
