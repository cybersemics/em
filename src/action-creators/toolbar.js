import { store } from '../store'

export const overlayReveal = id => {
  if (store.getState().toolbarOverlay !== id) {
    store.dispatch({ type: 'setToolbarOverlay', id })
  }
}

export const scrollPrioritize = val => {
  if (store.getState().scrollPrioritized !== val) {
    store.dispatch({ type: 'prioritizeScroll', val })
  }
}

export const overlayHide = () => {
  if (store.getState().toolbarOverlay) {
    store.dispatch({ type: 'setToolbarOverlay', id: null })
  }
}
