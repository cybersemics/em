import { store } from '../store.js'
import { SHOW_OVERLAY, HIDE_OVERLAY, UPDATE_OVERLAY } from '../constants'

export const overlayReveal = ({ id }) => {
  store.dispatch({
    type: SHOW_OVERLAY,
    id
  })
}

export const overlayUpdate = ({ id }) => {
  store.dispatch({
    type: UPDATE_OVERLAY,
    id
  })
}

export const overlayHide = () => {
  store.dispatch({
    type: HIDE_OVERLAY
  })
}
