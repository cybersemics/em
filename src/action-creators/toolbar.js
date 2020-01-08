import { store } from '../store.js'
import { SHOW_OVERLAY, HIDE_OVERLAY } from '../constants'

export const overlayReveal = (id) => {
  store.dispatch({
    type: SHOW_OVERLAY,
    id
  })
}

export const overlayHide = () => {
  store.dispatch({
    type: HIDE_OVERLAY
  })
}
