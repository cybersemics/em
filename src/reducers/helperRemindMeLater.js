import { isMobile } from '../browser.js'
import * as localForage from 'localforage'

// util
import {
  helperCleanup,
  restoreSelection,
} from '../util.js'

// SIDE EFFECTS: localStorage, restoreSelection
export const helperRemindMeLater = ({ cursor, editing, helpers }, { id, duration = 0 }) => {

  if (cursor && (editing || !isMobile)) {
    setTimeout(() => {
      restoreSelection(cursor)
    }, 0)
  }

  const time = Date.now() + duration
  localForage.setItem('helper-hideuntil-' + id, time)

  helperCleanup()

  return {
    showHelper: null,
    helpers: Object.assign({}, helpers, {
      [id]: Object.assign({}, helpers[id], {
        hideuntil: time
      })
    })
  }
}
