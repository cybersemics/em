// util
import {
  getThought,
  hashThought,
  headValue,
  syncRemote,
} from '../util.js'

import { updateThought } from '../db'

// SIDE EFFECTS: localStorage, syncRemote
export default ({ thoughtIndex }, { thoughtsRanked, newValue }) => {

  const value = headValue(thoughtsRanked)
  const oldThought = getThought(value, thoughtIndex)
  const newThought = Object.assign({}, oldThought, {
    code: newValue
  })

  thoughtIndex[hashThought(value)] = newThought

  setTimeout(() => {
    updateThought(hashThought(value), newThought).catch(err => {
      throw new Error(err)
    })
    syncRemote({
      [hashThought(value)]: newThought
    }, {})
  })

  return {
    thoughtIndex: Object.assign({}, thoughtIndex)
  }
}
