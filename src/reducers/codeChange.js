// util
import {
  sigKey,
  syncRemoteData,
} from '../util.js'

// SIDE EFFECTS: localStorage, syncRemoteData
export const codeChange = ({ data }, { itemsRanked, newValue }) => {

  const value = sigKey(itemsRanked)
  const oldItem = data[value]
  const newItem = Object.assign({}, oldItem, {
    code: newValue
  })

  data[value] = newItem

  setTimeout(() => {
    localStorage['data-' + value] = JSON.stringify(newItem)
    syncRemoteData({
      [value]: newItem
    }, {})
  })

  return {
    data: Object.assign({}, data)
  }
}