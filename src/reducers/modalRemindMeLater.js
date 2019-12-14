import { isMobile } from '../browser.js'
import * as localForage from 'localforage'

// util
import {
  modalCleanup,
  restoreSelection,
} from '../util.js'

// SIDE EFFECTS: localStorage, restoreSelection
export const modalRemindMeLater = ({ cursor, editing, modals }, { id, duration = 0 }) => {

  if (cursor && (editing || !isMobile)) {
    setTimeout(() => {
      restoreSelection(cursor)
    }, 0)
  }

  const time = Date.now() + duration
  localForage.setItem('modal-hideuntil-' + id, time)

  modalCleanup()

  return {
    showModal: null,
    modals: Object.assign({}, modals, {
      [id]: Object.assign({}, modals[id], {
        hideuntil: time
      })
    })
  }
}
