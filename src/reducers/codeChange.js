// util
import {
  getThought,
  hashThought,
  headKey,
  syncRemote,
} from '../util.js'

import * as localForage from 'localforage'

// SIDE EFFECTS: localStorage, syncRemote
export const codeChange = ({ thoughtIndex }, { thoughtsRanked, newValue }) => {

  const value = headKey(thoughtsRanked)
  const oldThought = getThought(value, thoughtIndex)
  const newThought = Object.assign({}, oldThought, {
    code: newValue
  })

  thoughtIndex[hashThought(value)] = newThought

  setTimeout(() => {
    localForage.setItem('thoughtIndex-' + hashThought(value), newThought).catch(err => {
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
