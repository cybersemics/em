// util
import {
  getThought,
  hashThought,
  headValue,
  syncRemote,
} from '../util.js'

import * as localForage from 'localforage'
import { dbOperations } from '../db.js'

// SIDE EFFECTS: localStorage, syncRemote
export default ({ thoughtIndex }, { thoughtsRanked, newValue }) => {

  const value = headValue(thoughtsRanked)
  const oldThought = getThought(value, thoughtIndex)
  const newThought = Object.assign({}, oldThought, {
    code: newValue
  })

  thoughtIndex[hashThought(value)] = newThought

  setTimeout(() => {
    // localForage.setItem('thoughtIndex-' + hashThought(value), newThought).catch(err => {
    //   throw new Error(err)
    // })
    dbOperations.updateThoughtIndex(hashThought(value), newThought)
    syncRemote({
      [hashThought(value)]: newThought
    }, {})
  })

  return {
    thoughtIndex: Object.assign({}, thoughtIndex)
  }
}
