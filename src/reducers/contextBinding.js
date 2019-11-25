import * as localForage from 'localForage'

// util
import {
  syncRemote,
} from '../util.js'

// SIDE EFFECTS: localStorage, syncRemote
export const settings = (state, { key, value, localOnly }) => {
  localForage.setItem('settings-' + key, value).catch(err => {
    throw new Error(err);
  })

  if (!localOnly) {
    setTimeout(() => {
      syncRemote({}, {}, { ['settings/' + key]: value })
    })
  }

  return {
    settings: Object.assign({}, state.settings, { [key]: value })
  }
}
