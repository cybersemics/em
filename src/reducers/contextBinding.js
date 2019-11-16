// util
import {
  syncRemote,
} from '../util.js'

// SIDE EFFECTS: localStorage, syncRemote
export const settings = (state, { key, value, localOnly }) => {
  localStorage['settings-' + key] = value

  if (!localOnly) {
    setTimeout(() => {
      syncRemote({}, {}, { ['settings/' + key]: value })
    })
  }

  return {
    settings: Object.assign({}, state.settings, { [key]: value })
  }
}
