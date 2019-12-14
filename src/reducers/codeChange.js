// util
import {
  getThought,
  hashThought,
  headKey,
  syncRemote,
} from '../util.js'

import * as localForage from 'localforage'

// SIDE EFFECTS: localStorage, syncRemote
export const codeChange = ({ thoughtIndex }, { itemsRanked, newValue }) => {

  const value = headKey(itemsRanked)
  const oldItem = getThought(value, thoughtIndex)
  const newItem = Object.assign({}, oldItem, {
    code: newValue
  })

  thoughtIndex[hashThought(value)] = newItem

  setTimeout(() => {
    localForage.setItem('thoughtIndex-' + hashThought(value), newItem).catch(err => {
      throw new Error(err)
    })
    syncRemote({
      [hashThought(value)]: newItem
    }, {})
  })

  return {
    thoughtIndex: Object.assign({}, thoughtIndex)
  }
}
