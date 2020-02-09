import { store } from '../store.js'
import { SHOW_OVERLAY, HIDE_OVERLAY, PRIORITIZE_SCROLL } from '../constants'

export const overlayReveal = id => {
  if (store.getState().toolbarOverlay !== id) {
    store.dispatch({ type: SHOW_OVERLAY, id })
  }
}

export const scrollPrioritize = val => {
  if (store.getState().scrollPrioritized !== val) {
    store.dispatch({ type: PRIORITIZE_SCROLL, val })
  }
}

export const overlayHide = () => {
  if (store.getState().toolbarOverlay) {
    store.dispatch({ type: HIDE_OVERLAY })
  }
}
