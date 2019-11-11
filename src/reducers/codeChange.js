// util
import {
  getThought,
  hashThought,
  sigKey,
  syncRemoteData,
} from '../util.js'

// SIDE EFFECTS: localStorage, syncRemoteData
export const codeChange = ({ data }, { itemsRanked, newValue }) => {

  const value = sigKey(itemsRanked)
  const oldItem = getThought(value, data)
  const newItem = Object.assign({}, oldItem, {
    code: newValue
  })

  data[hashThought(value)] = newItem

  setTimeout(() => {
    localStorage['data-' + hashThought(value)] = JSON.stringify(newItem)
    syncRemoteData({
      [value]: newItem
    }, {})
  })

  return {
    data: Object.assign({}, data)
  }
}