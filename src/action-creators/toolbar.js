import { store } from '../store.js'
import { SHOW_OVERLAY, HIDE_OVERLAY, PRIORITIZE_SCROLL } from '../constants'

export const overlayReveal = id => {
  store.dispatch({
    type: SHOW_OVERLAY,
    id
  })
}

export const scrollPrioritize = val => {
  store.dispatch({
    type: PRIORITIZE_SCROLL,
    val
  })
}

export const overlayHide = () => {
  store.dispatch({
    type: HIDE_OVERLAY
  })
}
