import * as localForage from 'localforage'

// util
import {
  modalCleanup,
} from '../util.js'

// SIDE EFFECTS: localStorage
export default ({ cursor, editing, modals }, { id, duration = 0 }) => {

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
