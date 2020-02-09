import { store } from '../store.js'

export const overlayReveal = id => {
  if (store.getState().toolbarOverlay !== id) {
    store.dispatch({ type: 'showOverlay', id })
  }
}

export const scrollPrioritize = val => {
  if (store.getState().scrollPrioritized !== val) {
    store.dispatch({ type: 'prioritizeScroll', val })
  }
}

export const overlayHide = () => {
  if (store.getState().toolbarOverlay) {
    store.dispatch({ type: 'hideOverlay' })
  }
}
