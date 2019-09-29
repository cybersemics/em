// TODO: This causes circular imports. What should we do?
import { syncRemote } from '../store'

// SIDE EFFECTS: localStorage, syncRemote
export const settingsReducer = ({ key, value, localOnly }, state) => {
    localStorage['settings-' + key] = value
  
    if (!localOnly) {
      setTimeout(() => {
        syncRemote({ ['settings/' + key]: value })
      })
    }
  
    return {
      settings: Object.assign({}, state.settings, { [key]: value })
    }
  }