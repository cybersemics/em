// util
import {
  syncRemote,
} from '../util.js'

// SIDE EFFECTS: localStorage, syncRemote
export const settings = (state, { key, value, remote = true }) => {
  localStorage['settings-' + key] = value

  if (remote) {
    setTimeout(() => {
      syncRemote({}, {}, { ['settings/' + key]: value })
    })
  }

  return {
    settings: Object.assign({}, state.settings, { [key]: value })
  }
}
