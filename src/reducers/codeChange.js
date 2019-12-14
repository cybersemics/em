// util
import {
  getThought,
  hashThought,
  headKey,
  syncRemote,
} from '../util.js'

import * as localForage from 'localforage'

// SIDE EFFECTS: localStorage, syncRemote
export const codeChange = ({ data }, { itemsRanked, newValue }) => {

  const value = headKey(itemsRanked)
  const oldItem = getThought(value, data)
  const newItem = Object.assign({}, oldItem, {
    code: newValue
  })

  data[hashThought(value)] = newItem

  setTimeout(() => {
    localForage.setItem('data-' + hashThought(value), newItem).catch(err => {
      throw new Error(err)
    })
    syncRemote({
      [hashThought(value)]: newItem
    }, {})
  })

  return {
    data: Object.assign({}, data)
  }
}
