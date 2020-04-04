// util
import {
  modalCleanup,
} from '../util'

// SIDE EFFECTS: localStorage
export default ({ cursor, editing, modals }, { id, duration = 0 }) => {

  const time = Date.now() + duration

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
